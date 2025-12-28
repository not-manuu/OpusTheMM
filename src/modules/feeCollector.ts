/**
 * ❄️ Frostbyte - Fee Collector Module
 *
 * Monitors pump.fun bonding curve for creator fees, claims them automatically,
 * and triggers distribution to the Frostbyte modules (25% each)
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { SolanaService } from '../services/solanaService';
import { TransactionService } from '../services/transactionService';
import {
  PUMP_FUN_PROGRAM,
  PUMP_FUN_GLOBAL,
  PUMP_FUN_EVENT_AUTHORITY,
} from '../config/constants';
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

    logger.info('🎅 Fee Collector initialized', {
      token: this.config.tokenAddress.toString(),
      bondingCurve: this.config.bondingCurveAddress.toString(),
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

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Fee collector already running');
      return;
    }

    logger.info('🚀 Fee collector starting...', {
      token: this.config.tokenAddress.toString(),
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
      const feeBalance = await this.getCreatorFeeBalance();

      logger.debug('Fee balance check', {
        balance: feeBalance,
        threshold: this.config.minimumClaimThreshold,
      });

      if (feeBalance >= this.config.minimumClaimThreshold) {
        logger.info('💰 Fee threshold reached, claiming...', { amount: feeBalance });

        if (this.config.dryRun) {
          logger.info('[DRY RUN] Would claim fees', { amount: feeBalance });
          await this.distributeFees(feeBalance);
          return;
        }

        const signature = await this.claimFees();

        logger.info('✅ Fees claimed', { signature, amount: feeBalance });

        this.stats.totalCollected += feeBalance;
        this.stats.lastClaimAmount = feeBalance;
        this.stats.lastClaimTime = new Date();
        this.stats.claimCount++;
        this.lastClaimSignature = signature;

        // Broadcast fee collected event to dashboard
        wsManager.broadcastFeeCollected(feeBalance, signature);

        await this.distributeFees(feeBalance);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to check/claim fees', { error: errorMsg });
      wsManager.broadcastError('Fee collection failed', { error: errorMsg });
      throw error;
    }
  }

  private async getCreatorFeeBalance(): Promise<number> {
    try {
      const connection = this.solanaService.getConnection();
      const accountInfo = await connection.getAccountInfo(
        this.config.bondingCurveAddress
      );

      if (!accountInfo) {
        throw new Error('Bonding curve account not found');
      }

      const data = this.decodeBondingCurve(accountInfo.data);
      
      const solBalance = await this.solanaService.getSolBalance(
        this.config.bondingCurveAddress
      );

      const realSolReserves = data.realSolReserves.toNumber() / LAMPORTS_PER_SOL;
      const availableFees = Math.max(0, solBalance - realSolReserves);

      logger.debug('Bonding curve state', {
        solBalance,
        realSolReserves,
        availableFees,
        complete: data.complete,
      });

      return availableFees;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get creator fee balance', { error: errorMsg });
      throw error;
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

  private async claimFees(): Promise<string> {
    try {
      const creatorAta = await getAssociatedTokenAddress(
        this.config.tokenAddress,
        this.config.creatorWallet.publicKey
      );

      const instruction = this.buildWithdrawInstruction(creatorAta);

      const transaction = await this.transactionService.buildTransaction(
        [instruction],
        this.config.creatorWallet.publicKey
      );

      const signature = await this.transactionService.sendAndConfirm(
        transaction,
        [this.config.creatorWallet]
      );

      return signature;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to claim fees', { error: errorMsg });
      throw error;
    }
  }

  private buildWithdrawInstruction(creatorAta: PublicKey): TransactionInstruction {
    const WITHDRAW_DISCRIMINATOR = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);

    const keys = [
      { pubkey: PUMP_FUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: this.config.bondingCurveAddress, isSigner: false, isWritable: true },
      { pubkey: this.config.associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: this.config.creatorWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: creatorAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: PUMP_FUN_PROGRAM,
      data: WITHDRAW_DISCRIMINATOR,
    });
  }

  private async distributeFees(totalAmount: number): Promise<void> {
    const { distributionPercentages } = this.config;

    const amounts = {
      volume: totalAmount * (distributionPercentages.volume / 100),
      buyback: totalAmount * (distributionPercentages.buyback / 100),
      airdrop: totalAmount * (distributionPercentages.airdrop / 100),
      treasury: totalAmount * (distributionPercentages.treasury / 100),
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
