/**
 * ❄️ Frostbyte - Fee Collector Module
 *
 * Claims creator rewards from Pump.fun's new reward system via Pump Portal API,
 * and triggers distribution to the Frostbyte modules (25% each)
 */

import {
  SystemProgram,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { SolanaService } from '../services/solanaService';
import { TransactionService } from '../services/transactionService';
import { logger } from '../utils/logger';
import { wsManager } from '../api/websocket/events';
import {
  FeeCollectorConfig,
  FeeStats,
  DistributionRecord,
  BondingCurveData,
  IVolumeCreator,
  IBuybackBurner,
  IAirdropDistributor,
  TreasuryStats,
  TreasuryRecord,
} from '../types';
import { DecisionEngine, AllocationPercentages } from '../ai';

// Pump Portal API endpoint for claiming creator fees
const PUMP_PORTAL_API = 'https://pumpportal.fun/api/trade-local';

export class FeeCollector {
  private config: FeeCollectorConfig;
  private solanaService: SolanaService;
  private transactionService: TransactionService;
  private stats: FeeStats;
  private treasuryStats: TreasuryStats;
  private isRunning: boolean;
  private intervalHandle?: NodeJS.Timeout;
  private lastClaimSignature: string | null = null;

  private volumeCreator?: IVolumeCreator;
  private buybackBurner?: IBuybackBurner;
  private airdropDistributor?: IAirdropDistributor;
  private decisionEngine?: DecisionEngine;

  constructor(
    config: FeeCollectorConfig,
    solanaService: SolanaService,
    transactionService: TransactionService
  ) {
    this.config = config;
    this.solanaService = solanaService;
    this.transactionService = transactionService;
    this.isRunning = false;

    this.stats = {
      totalCollected: 0,
      lastClaimAmount: 0,
      lastClaimTime: null,
      claimCount: 0,
      distributionHistory: [],
    };

    this.treasuryStats = {
      totalReceived: 0,
      transferCount: 0,
      lastTransferTime: null,
      transferHistory: [],
    };

    this.validateConfig();

    logger.info('🎅 Fee Collector initialized (Pump Portal API)', {
      token: this.config.tokenAddress.toString(),
      creator: this.config.creatorWallet.publicKey.toString(),
      threshold: this.config.minimumClaimThreshold,
      checkInterval: this.config.checkInterval,
      dryRun: this.config.dryRun,
    });
  }

  private validateConfig(): void {
    const { distributionPercentages } = this.config;
    const total =
      distributionPercentages.volume +
      distributionPercentages.buyback +
      distributionPercentages.airdrop +
      distributionPercentages.treasury;

    if (total !== 100) {
      throw new Error(`Distribution percentages must total 100%, got ${total}%`);
    }

    if (this.config.minimumClaimThreshold <= 0) {
      throw new Error('Minimum claim threshold must be greater than 0');
    }

    if (this.config.checkInterval < 5000) {
      throw new Error('Check interval must be at least 5000ms');
    }
  }

  setVolumeCreator(volumeCreator: IVolumeCreator): void {
    this.volumeCreator = volumeCreator;
    logger.debug('Volume creator set');
  }

  setBuybackBurner(buybackBurner: IBuybackBurner): void {
    this.buybackBurner = buybackBurner;
    logger.debug('Buyback burner set');
  }

  setAirdropDistributor(airdropDistributor: IAirdropDistributor): void {
    this.airdropDistributor = airdropDistributor;
    logger.debug('Airdrop distributor set');
  }

  /**
   * Set the AI Decision Engine for dynamic fee allocation
   */
  setDecisionEngine(decisionEngine: DecisionEngine): void {
    this.decisionEngine = decisionEngine;
    logger.info('🧠 AI Decision Engine connected to Fee Collector');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Fee collector already running');
      return;
    }

    logger.info('🚀 Fee collector starting (Pump Portal API)...', {
      token: this.config.tokenAddress.toString(),
      creator: this.config.creatorWallet.publicKey.toString(),
      checkInterval: this.config.checkInterval,
    });

    this.isRunning = true;

    this.intervalHandle = setInterval(async () => {
      try {
        await this.checkAndClaimFees();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Fee check cycle failed', { error: errorMsg });
      }
    }, this.config.checkInterval);

    await this.checkAndClaimFees();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Fee collector not running');
      return;
    }

    logger.info('🛑 Fee collector stopping...');

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    this.isRunning = false;
    logger.info('Fee collector stopped');
  }

  async checkAndClaimFees(): Promise<void> {
    try {
      // Get wallet balance before claiming
      const balanceBefore = await this.solanaService.getSolBalance(
        this.config.creatorWallet.publicKey
      );

      logger.debug('Attempting to claim creator rewards via Pump Portal...', {
        wallet: this.config.creatorWallet.publicKey.toString(),
        balanceBefore,
      });

      if (this.config.dryRun) {
        logger.info('[DRY RUN] Would attempt to claim creator rewards');
        return;
      }

      // Attempt to claim via Pump Portal API
      const signature = await this.claimCreatorRewards();

      if (!signature) {
        logger.debug('No creator rewards to claim or claim failed');
        return;
      }

      // Wait a moment for the transaction to be reflected
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get wallet balance after claiming
      const balanceAfter = await this.solanaService.getSolBalance(
        this.config.creatorWallet.publicKey
      );

      const claimedAmount = balanceAfter - balanceBefore;

      if (claimedAmount > 0) {
        logger.info('💰 Creator rewards claimed!', {
          signature,
          amount: claimedAmount.toFixed(6),
        });

        this.stats.totalCollected += claimedAmount;
        this.stats.lastClaimAmount = claimedAmount;
        this.stats.lastClaimTime = new Date();
        this.stats.claimCount++;
        this.lastClaimSignature = signature;

        // Broadcast fee collected event to dashboard
        wsManager.broadcastFeeCollected(claimedAmount, signature);

        // Distribute the claimed rewards
        if (claimedAmount >= this.config.minimumClaimThreshold) {
          await this.distributeFees(claimedAmount);
        } else {
          logger.info('Claimed amount below distribution threshold, accumulating...', {
            claimed: claimedAmount,
            threshold: this.config.minimumClaimThreshold,
          });
        }
      } else {
        logger.debug('No rewards were claimed (balance unchanged)');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      // Don't log as error if it's just "no rewards to claim"
      if (errorMsg.includes('no rewards') || errorMsg.includes('No fees')) {
        logger.debug('No creator rewards available to claim');
      } else {
        logger.error('Failed to claim creator rewards', { error: errorMsg });
        wsManager.broadcastError('Creator reward claim failed', { error: errorMsg });
      }
    }
  }

  private decodeBondingCurve(data: Buffer): BondingCurveData {
    const BONDING_CURVE_DISCRIMINATOR = 8;
    const BN_SIZE = 8;

    let offset = BONDING_CURVE_DISCRIMINATOR;

    const virtualTokenReserves = new BN(data.subarray(offset, offset + BN_SIZE), 'le');
    offset += BN_SIZE;

    const virtualSolReserves = new BN(data.subarray(offset, offset + BN_SIZE), 'le');
    offset += BN_SIZE;

    const realTokenReserves = new BN(data.subarray(offset, offset + BN_SIZE), 'le');
    offset += BN_SIZE;

    const realSolReserves = new BN(data.subarray(offset, offset + BN_SIZE), 'le');
    offset += BN_SIZE;

    const tokenTotalSupply = new BN(data.subarray(offset, offset + BN_SIZE), 'le');
    offset += BN_SIZE;

    const complete = data[offset] === 1;

    return {
      virtualTokenReserves,
      virtualSolReserves,
      realTokenReserves,
      realSolReserves,
      tokenTotalSupply,
      complete,
    };
  }

  /**
   * Claim creator rewards via Pump Portal API
   * Uses the new Pump.fun creator rewards system
   */
  private async claimCreatorRewards(): Promise<string | null> {
    try {
      logger.debug('Requesting claim transaction from Pump Portal...');

      // Request unsigned transaction from Pump Portal
      const response = await fetch(PUMP_PORTAL_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          publicKey: this.config.creatorWallet.publicKey.toString(),
          action: 'collectCreatorFee',
          priorityFee: '0.0001', // Small priority fee for faster confirmation
          pool: 'pump',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Handle "no rewards to claim" - Pump Portal returns 400 when there's nothing to claim
        if (
          response.status === 400 ||
          (errorText.includes('no') && (errorText.includes('fee') || errorText.includes('reward')))
        ) {
          logger.debug('No creator rewards available to claim');
          return null;
        }
        throw new Error(`Pump Portal API error: ${response.status} - ${errorText}`);
      }

      // Get the transaction bytes
      const txBuffer = await response.arrayBuffer();

      if (txBuffer.byteLength === 0) {
        logger.debug('Empty response from Pump Portal - no rewards to claim');
        return null;
      }

      // Deserialize the versioned transaction
      const txBytes = new Uint8Array(txBuffer);
      const transaction = VersionedTransaction.deserialize(txBytes);

      // Sign the transaction
      transaction.sign([this.config.creatorWallet]);

      // Send the signed transaction
      const connection = this.solanaService.getConnection();
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      logger.debug('Claim transaction sent', { signature });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info('✅ Creator rewards claim confirmed', { signature });
      return signature;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases gracefully
      if (errorMsg.includes('no') || errorMsg.includes('empty') || errorMsg.includes('0x0')) {
        logger.debug('No creator rewards to claim at this time');
        return null;
      }

      logger.error('Failed to claim creator rewards', { error: errorMsg });
      throw error;
    }
  }

  private async distributeFees(totalAmount: number): Promise<void> {
    // Get allocation percentages - either from AI or default config
    let allocation: AllocationPercentages;
    let aiDecided = false;

    if (this.decisionEngine && this.decisionEngine.isEnabled()) {
      try {
        logger.info('🧠 Requesting AI decision for fee allocation...');
        allocation = await this.decisionEngine.decide(totalAmount);
        aiDecided = true;
        logger.info('🧠 AI decided allocation', { allocation });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('AI decision failed, using default allocation', { error: errorMsg });
        allocation = this.config.distributionPercentages;
      }
    } else {
      allocation = this.config.distributionPercentages;
    }

    const amounts = {
      volume: totalAmount * (allocation.volume / 100),
      buyback: totalAmount * (allocation.buyback / 100),
      airdrop: totalAmount * (allocation.airdrop / 100),
      treasury: totalAmount * (allocation.treasury / 100),
    };

    const record: DistributionRecord = {
      timestamp: new Date(),
      totalAmount,
      volumeShare: amounts.volume,
      buybackShare: amounts.buyback,
      airdropShare: amounts.airdrop,
      treasuryShare: amounts.treasury,
      success: false,
      errors: [],
    };

    logger.info('🎅 Frostbyte distributing fees...', {
      totalAmount,
      volume: amounts.volume,
      buyback: amounts.buyback,
      airdrop: amounts.airdrop,
      treasury: amounts.treasury,
      aiDecided,
      allocation,
    });

    try {
      if (this.volumeCreator) {
        try {
          await this.volumeCreator.createVolume(amounts.volume);
          logger.info(`✅ Reindeer 1 (Volume): ${amounts.volume.toFixed(6)} SOL`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          record.errors.push(`Reindeer 1 (Volume): ${errorMsg}`);
          logger.error('🦌 Reindeer 1 (Volume) failed', { error: errorMsg });
        }
      } else {
        logger.info(`[MOCK] Reindeer 1 (Volume): ${amounts.volume.toFixed(6)} SOL`);
      }

      if (this.buybackBurner) {
        try {
          await this.buybackBurner.buybackAndBurn(amounts.buyback);
          logger.info(`✅ Reindeer 2 (Buyback & Burn): ${amounts.buyback.toFixed(6)} SOL`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          record.errors.push(`Reindeer 2 (Buyback): ${errorMsg}`);
          logger.error('🦌 Reindeer 2 (Buyback & Burn) failed', { error: errorMsg });
        }
      } else {
        logger.info(`[MOCK] Reindeer 2 (Buyback & Burn): ${amounts.buyback.toFixed(6)} SOL`);
      }

      if (this.airdropDistributor) {
        try {
          await this.airdropDistributor.distribute(amounts.airdrop);
          logger.info(`✅ Reindeer 3 (Airdrops): ${amounts.airdrop.toFixed(6)} SOL`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          record.errors.push(`Reindeer 3 (Airdrop): ${errorMsg}`);
          logger.error('🦌 Reindeer 3 (Airdrops) failed', { error: errorMsg });
        }
      } else {
        logger.info(`[MOCK] Reindeer 3 (Airdrops): ${amounts.airdrop.toFixed(6)} SOL`);
      }

      try {
        const treasurySig = await this.sendToTreasury(amounts.treasury);
        logger.info(`✅ Reindeer 4 (Treasury): ${amounts.treasury.toFixed(6)} SOL`, {
          signature: treasurySig,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        record.errors.push(`Reindeer 4 (Treasury): ${errorMsg}`);
        logger.error('🦌 Reindeer 4 (Treasury) failed', { error: errorMsg });
      }

      record.success = record.errors.length === 0;
      this.stats.distributionHistory.push(record);

      logger.info('🎅 Distribution complete!', {
        successful: 4 - record.errors.length,
        failed: record.errors.length,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Critical distribution error', { error: errorMsg });
      record.errors.push(`Critical: ${errorMsg}`);
      this.stats.distributionHistory.push(record);
      throw error;
    }
  }

  private async sendToTreasury(amount: number): Promise<string> {
    if (this.config.dryRun) {
      logger.info('[DRY RUN] Would send to treasury', {
        amount,
        destination: this.config.treasuryWalletAddress.toString(),
      });
      return 'dry-run-signature';
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const instruction = SystemProgram.transfer({
      fromPubkey: this.config.creatorWallet.publicKey,
      toPubkey: this.config.treasuryWalletAddress,
      lamports,
    });

    const transaction = await this.transactionService.buildTransaction(
      [instruction],
      this.config.creatorWallet.publicKey
    );

    const signature = await this.transactionService.sendAndConfirm(
      transaction,
      [this.config.creatorWallet]
    );

    const treasuryRecord: TreasuryRecord = {
      timestamp: new Date(),
      amount,
      signature,
      success: true,
    };

    this.treasuryStats.totalReceived += amount;
    this.treasuryStats.transferCount++;
    this.treasuryStats.lastTransferTime = new Date();
    this.treasuryStats.transferHistory.push(treasuryRecord);

    // Broadcast treasury transfer event to dashboard
    wsManager.broadcastTreasury(amount, signature);

    return signature;
  }

  getStats(): FeeStats {
    return { ...this.stats };
  }

  getTreasuryStats(): TreasuryStats {
    return { ...this.treasuryStats };
  }

  getLastClaimSignature(): string | null {
    return this.lastClaimSignature;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the AI Decision Engine (for API/dashboard access)
   */
  getDecisionEngine(): DecisionEngine | undefined {
    return this.decisionEngine;
  }

  /**
   * Check if AI-powered allocation is active
   */
  isAIPowered(): boolean {
    return this.decisionEngine?.isEnabled() ?? false;
  }

  async getBondingCurveStatus(): Promise<{
    virtualTokenReserves: number;
    virtualSolReserves: number;
    realTokenReserves: number;
    realSolReserves: number;
    tokenTotalSupply: number;
    complete: boolean;
    progressPercent: number;
  }> {
    const connection = this.solanaService.getConnection();
    const accountInfo = await connection.getAccountInfo(
      this.config.bondingCurveAddress
    );

    if (!accountInfo) {
      throw new Error('Bonding curve account not found');
    }

    const data = this.decodeBondingCurve(accountInfo.data);

    const INITIAL_VIRTUAL_SOL = 30 * LAMPORTS_PER_SOL;
    const GRADUATION_THRESHOLD = 85 * LAMPORTS_PER_SOL;

    const currentVirtualSol = data.virtualSolReserves.toNumber();
    const progress = currentVirtualSol - INITIAL_VIRTUAL_SOL;
    const progressPercent = Math.min(100, (progress / GRADUATION_THRESHOLD) * 100);

    return {
      virtualTokenReserves: data.virtualTokenReserves.toNumber(),
      virtualSolReserves: data.virtualSolReserves.toNumber(),
      realTokenReserves: data.realTokenReserves.toNumber(),
      realSolReserves: data.realSolReserves.toNumber(),
      tokenTotalSupply: data.tokenTotalSupply.toNumber(),
      complete: data.complete,
      progressPercent,
    };
  }
}
