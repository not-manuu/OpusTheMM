/**
 * 🦌 Reindeer 2: Buyback & Burn
 *
 * Buys tokens from pump.fun bonding curve and permanently burns them
 * Creates deflationary pressure by reducing circulating supply
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getMint,
} from '@solana/spl-token';
import BN from 'bn.js';
import { logger } from '../utils/logger';
import { SolanaService } from '../services/solanaService';
import { TransactionService } from '../services/transactionService';
import {
  BuybackBurnConfig,
  IBuybackBurner,
  BurnStats,
  BurnRecord,
  BondingCurveData,
} from '../types';
import {
  PUMP_FUN_PROGRAM,
  PUMP_FUN_GLOBAL,
  PUMP_FUN_FEE_RECIPIENT,
  BURN_ADDRESS,
} from '../config/constants';

export class BuybackBurner implements IBuybackBurner {
  private config: BuybackBurnConfig;
  private solanaService: SolanaService;
  private txService: TransactionService;
  private stats: BurnStats;

  constructor(
    config: BuybackBurnConfig,
    solanaService: SolanaService,
    txService: TransactionService
  ) {
    this.config = config;
    this.solanaService = solanaService;
    this.txService = txService;
    this.stats = {
      totalBurned: 0,
      totalSolSpent: 0,
      burnCount: 0,
      lastBurnTime: null,
      burnHistory: [],
    };

    // Validate config
    if (config.maxBurnPerTx <= 0) {
      throw new Error('Max burn per transaction must be greater than 0');
    }

    if (config.slippageBps < 0 || config.slippageBps > 10000) {
      throw new Error('Slippage BPS must be between 0 and 10000');
    }

    logger.info('🦌 Reindeer 2 (Buyback & Burn) initialized', {
      tokenAddress: config.tokenAddress.toString(),
      slippageBps: config.slippageBps,
      maxBurnPerTx: config.maxBurnPerTx,
      dryRun: config.dryRun,
    });
  }

  /**
   * Execute buyback and burn operation
   * Called by Santa with allocated SOL amount
   */
  async buybackAndBurn(amountSol: number): Promise<void> {
    logger.info('🔥 Reindeer 2 starting buyback & burn', {
      allocatedSol: amountSol,
      dryRun: this.config.dryRun,
    });

    const record: BurnRecord = {
      timestamp: new Date(),
      tokensBurned: 0,
      solSpent: amountSol,
      signature: '',
      burnSignature: '',
      success: false,
    };

    try {
      if (this.config.dryRun) {
        logger.info('🔵 DRY RUN: Would execute buyback & burn', {
          amountSol,
        });

        // Simulate successful burn in dry run
        const estimatedTokens = await this.calculateExpectedTokens(amountSol);
        record.tokensBurned = estimatedTokens;
        record.signature = 'DRY_RUN_BUY_SIGNATURE';
        record.burnSignature = 'DRY_RUN_BURN_SIGNATURE';
        record.success = true;

        this.updateStats(record);
        return;
      }

      // Check SOL balance before buyback
      const solBalance = await this.solanaService.getSolBalance(
        this.config.burnWallet.publicKey
      );
      const requiredSol = amountSol + 0.01; // Buffer for fees

      if (solBalance < requiredSol) {
        throw new Error(
          `Insufficient SOL balance: ${solBalance.toFixed(4)} SOL, need ${requiredSol.toFixed(4)} SOL`
        );
      }

      // Estimate tokens before buying to validate against max burn limit
      const estimatedTokens = await this.calculateExpectedTokens(amountSol);
      logger.debug('Estimated tokens from buyback', {
        estimatedTokens,
        maxBurnPerTx: this.config.maxBurnPerTx,
      });

      // Step 1: Execute buyback
      const { tokensReceived, signature: buySignature } =
        await this.executeBuyback(amountSol);

      record.signature = buySignature;
      record.tokensBurned = tokensReceived;

      logger.info('💰 Buyback complete', {
        tokensReceived,
        estimatedTokens,
        signature: buySignature,
      });

      // Validate burn amount (should rarely trigger if estimate was accurate)
      if (tokensReceived > this.config.maxBurnPerTx) {
        logger.warn('⚠️ Burn amount exceeds max, capping', {
          received: tokensReceived,
          max: this.config.maxBurnPerTx,
        });
      }

      const tokensToBurn = Math.min(tokensReceived, this.config.maxBurnPerTx);

      // Step 2: Burn tokens
      const burnSignature = await this.burnTokens(tokensToBurn);
      record.burnSignature = burnSignature;
      record.success = true;

      this.updateStats(record);

      logger.info('✅ Buyback & burn complete', {
        tokensBurned: tokensToBurn,
        solSpent: amountSol,
        buySignature,
        burnSignature,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      record.error = errorMsg;
      this.stats.burnHistory.push(record);

      logger.error('❌ Buyback & burn failed', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Execute buyback from pump.fun bonding curve
   */
  private async executeBuyback(
    amountSol: number
  ): Promise<{ tokensReceived: number; signature: string }> {
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    logger.info('💰 Executing buyback', {
      amountSol,
      lamports,
    });

    // Get burn wallet's token account
    const burnTokenAccount = await getAssociatedTokenAddress(
      this.config.tokenAddress,
      this.config.burnWallet.publicKey
    );

    // Get token balance before trade
    let tokenBalanceBefore = 0;
    try {
      tokenBalanceBefore = await this.solanaService.getTokenBalance(
        this.config.burnWallet.publicKey,
        this.config.tokenAddress
      );
      logger.debug('Pre-buyback token balance', { balance: tokenBalanceBefore });
    } catch {
      logger.debug('ATA does not exist yet, will be created by trade');
    }

    // Build buy instruction
    const buyIx = await this.createBuyInstruction(
      this.config.burnWallet.publicKey,
      burnTokenAccount,
      lamports
    );

    // Create and send transaction
    const transaction = new Transaction().add(buyIx);
    const signature = await this.txService.sendAndConfirm(transaction, [
      this.config.burnWallet,
    ]);

    // Get balance after trade
    const tokenBalanceAfter = await this.solanaService.getTokenBalance(
      this.config.burnWallet.publicKey,
      this.config.tokenAddress
    );

    const tokensReceived = tokenBalanceAfter - tokenBalanceBefore;

    logger.info('✅ Buyback executed', {
      signature,
      tokensReceived,
      balanceBefore: tokenBalanceBefore,
      balanceAfter: tokenBalanceAfter,
    });

    return { tokensReceived, signature };
  }

  /**
   * Create pump.fun buy instruction
   */
  private async createBuyInstruction(
    buyer: PublicKey,
    buyerTokenAccount: PublicKey,
    lamports: number
  ): Promise<TransactionInstruction> {
    // Calculate max SOL with slippage
    const slippageMultiplier = 1 + this.config.slippageBps / 10000;
    const maxSolCost = Math.floor(lamports * slippageMultiplier);

    // pump.fun buy discriminator
    const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

    // Instruction data: discriminator + amount + maxSolCost
    const data = Buffer.concat([
      discriminator,
      new BN(lamports).toArrayLike(Buffer, 'le', 8),
      new BN(maxSolCost).toArrayLike(Buffer, 'le', 8),
    ]);

    // Event authority PDA
    const [eventAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('__event_authority')],
      PUMP_FUN_PROGRAM
    );

    return new TransactionInstruction({
      keys: [
        { pubkey: PUMP_FUN_GLOBAL, isSigner: false, isWritable: false },
        { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
        { pubkey: this.config.tokenAddress, isSigner: false, isWritable: false },
        { pubkey: this.config.bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: this.config.associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: eventAuthority, isSigner: false, isWritable: false },
        { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
      ],
      programId: PUMP_FUN_PROGRAM,
      data,
    });
  }

  /**
   * Burn tokens by transferring to dead address
   * Uses dead address for full traceability on Solscan
   */
  private async burnTokens(tokenAmount: number): Promise<string> {
    logger.info('🔥 Burning tokens to dead address', {
      amount: tokenAmount,
      burnAddress: BURN_ADDRESS.toString(),
    });

    // Get source token account (burn wallet's ATA)
    const sourceTokenAccount = await getAssociatedTokenAddress(
      this.config.tokenAddress,
      this.config.burnWallet.publicKey
    );

    // Get dead address token account
    const deadTokenAccount = await getAssociatedTokenAddress(
      this.config.tokenAddress,
      BURN_ADDRESS
    );

    const instructions: TransactionInstruction[] = [];

    // Check if dead address ATA exists, create if needed
    const connection = this.solanaService.getConnection();
    const deadAccountInfo = await connection.getAccountInfo(deadTokenAccount);

    if (!deadAccountInfo) {
      logger.debug('Creating ATA for dead address');
      const createAtaIx = createAssociatedTokenAccountInstruction(
        this.config.burnWallet.publicKey,
        deadTokenAccount,
        BURN_ADDRESS,
        this.config.tokenAddress
      );
      instructions.push(createAtaIx);
    }

    // Build transfer instruction to dead address
    const transferIx = createTransferInstruction(
      sourceTokenAccount,
      deadTokenAccount,
      this.config.burnWallet.publicKey,
      BigInt(Math.floor(tokenAmount))
    );
    instructions.push(transferIx);

    // Create and send transaction
    const transaction = new Transaction().add(...instructions);
    const signature = await this.txService.sendAndConfirm(transaction, [
      this.config.burnWallet,
    ]);

    logger.info('✅ Tokens sent to dead address', {
      signature,
      amount: tokenAmount,
      deadAddress: BURN_ADDRESS.toString(),
    });

    return signature;
  }

  /**
   * Calculate expected tokens from bonding curve
   * Uses constant product formula: tokens_out = (sol_in * virtualTokenReserves) / (virtualSolReserves + sol_in)
   */
  private async calculateExpectedTokens(solAmount: number): Promise<number> {
    try {
      const connection = this.solanaService.getConnection();
      const accountInfo = await connection.getAccountInfo(
        this.config.bondingCurveAddress
      );

      if (!accountInfo) {
        throw new Error('Bonding curve account not found');
      }

      const bondingCurve = this.decodeBondingCurve(accountInfo.data);

      // Bonding curve formula: tokens_out = (sol_in * virtualTokenReserves) / (virtualSolReserves + sol_in)
      const solLamports = solAmount * LAMPORTS_PER_SOL;
      const virtualTokenReserves = bondingCurve.virtualTokenReserves.toNumber();
      const virtualSolReserves = bondingCurve.virtualSolReserves.toNumber();

      if (virtualSolReserves <= 0 || virtualTokenReserves <= 0) {
        logger.warn('Invalid bonding curve reserves', {
          virtualTokenReserves,
          virtualSolReserves,
        });
        return 0;
      }

      const tokensOut =
        (solLamports * virtualTokenReserves) / (virtualSolReserves + solLamports);

      logger.debug('Token calculation', {
        solAmount,
        solLamports,
        virtualTokenReserves,
        virtualSolReserves,
        tokensOut,
      });

      return Math.floor(tokensOut);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to calculate expected tokens, returning 0', { error: errorMsg });
      return 0;
    }
  }

  /**
   * Decode bonding curve account data
   */
  private decodeBondingCurve(data: Buffer): BondingCurveData {
    const BONDING_CURVE_DISCRIMINATOR = 8;
    const BN_SIZE = 8;

    let offset = BONDING_CURVE_DISCRIMINATOR;

    const virtualTokenReserves = new BN(
      data.subarray(offset, offset + BN_SIZE),
      'le'
    );
    offset += BN_SIZE;

    const virtualSolReserves = new BN(
      data.subarray(offset, offset + BN_SIZE),
      'le'
    );
    offset += BN_SIZE;

    const realTokenReserves = new BN(
      data.subarray(offset, offset + BN_SIZE),
      'le'
    );
    offset += BN_SIZE;

    const realSolReserves = new BN(
      data.subarray(offset, offset + BN_SIZE),
      'le'
    );
    offset += BN_SIZE;

    const tokenTotalSupply = new BN(
      data.subarray(offset, offset + BN_SIZE),
      'le'
    );
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
   * Update statistics after successful burn
   */
  private updateStats(record: BurnRecord): void {
    this.stats.totalBurned += record.tokensBurned;
    this.stats.totalSolSpent += record.solSpent;
    this.stats.burnCount++;
    this.stats.lastBurnTime = new Date();
    this.stats.burnHistory.push(record);
  }

  /**
   * Get current stats
   */
  getStats(): BurnStats {
    return {
      ...this.stats,
      burnHistory: [...this.stats.burnHistory],
    };
  }

  /**
   * Get total token supply
   */
  async getTotalSupply(): Promise<number> {
    try {
      const mintInfo = await getMint(
        this.solanaService.getConnection(),
        this.config.tokenAddress
      );
      return Number(mintInfo.supply);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get total supply', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Get burn percentage of total supply
   */
  async getBurnPercentage(): Promise<number> {
    try {
      const totalSupply = await this.getTotalSupply();
      if (totalSupply === 0) return 0;
      return (this.stats.totalBurned / totalSupply) * 100;
    } catch (error) {
      logger.debug('Could not calculate burn percentage, mint data unavailable');
      return 0;
    }
  }

  /**
   * Export burn history for transparency/dashboard
   */
  exportBurnHistory(): BurnRecord[] {
    return this.stats.burnHistory.map((record) => ({
      ...record,
    }));
  }

  /**
   * Generate burn report string
   */
  async generateBurnReport(): Promise<string> {
    const burnPercentage = await this.getBurnPercentage();
    const avgPrice =
      this.stats.burnCount > 0
        ? this.stats.totalSolSpent / this.stats.totalBurned
        : 0;

    return `
🔥 BURN REPORT
==============
Total Tokens Burned: ${this.stats.totalBurned.toLocaleString()}
Total SOL Spent: ${this.stats.totalSolSpent.toFixed(6)}
Burn Count: ${this.stats.burnCount}
Average Price: ${avgPrice.toFixed(12)} SOL/token
Burn Percentage: ${burnPercentage.toFixed(4)}% of total supply
Last Burn: ${this.stats.lastBurnTime?.toISOString() || 'Never'}
    `.trim();
  }
}
