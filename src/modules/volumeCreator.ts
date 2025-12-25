/**
 * 🦌 Reindeer 1: Volume Creator
 *
 * Creates organic-looking trading volume using the creator wallet
 * Receives SOL from Santa and executes randomized buy trades
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';
import { logger } from '../utils/logger';
import { SolanaService } from '../services/solanaService';
import { TransactionService } from '../services/transactionService';
import {
  VolumeCreatorConfig,
  IVolumeCreator,
  VolumeStats,
} from '../types';
import { PUMP_FUN_PROGRAM, PUMP_FUN_GLOBAL, PUMP_FUN_FEE_RECIPIENT } from '../config/constants';

export class VolumeCreator implements IVolumeCreator {
  private config: VolumeCreatorConfig;
  private solanaService: SolanaService;
  private txService: TransactionService;
  private stats: VolumeStats;
  private isRunning = false;

  constructor(
    config: VolumeCreatorConfig,
    solanaService: SolanaService,
    txService: TransactionService
  ) {
    this.config = config;
    this.solanaService = solanaService;
    this.txService = txService;
    this.stats = {
      totalVolume: 0,
      tradeCount: 0,
      successfulTrades: 0,
      failedTrades: 0,
      lastTradeTime: null,
      tradeHistory: [],
    };

    logger.info('🦌 Reindeer 1 (Volume Creator) initialized', {
      tokenAddress: config.tokenAddress.toString(),
      walletCount: config.wallets.length,
      tradeRange: `${config.minTradeAmount}-${config.maxTradeAmount} SOL`,
      delayRange: `${config.minDelaySeconds}-${config.maxDelaySeconds}s`,
      dryRun: config.dryRun,
    });
  }

  /**
   * Create volume by executing randomized buy trades
   * Called by Santa with allocated SOL amount
   */
  async createVolume(amountSol: number): Promise<void> {
    if (this.isRunning) {
      logger.warn('🦌 Volume creation already in progress, skipping');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('🦌 Reindeer 1 starting volume creation', {
        allocatedSol: amountSol,
        dryRun: this.config.dryRun,
      });

      // Split total amount into randomized trades
      const trades = this.splitIntoTrades(amountSol);

      logger.info(`🦌 Generated ${trades.length} trades`, {
        totalSol: amountSol,
        trades: trades.map((t) => t.toFixed(4)),
      });

      // Execute trades sequentially with random delays
      for (let i = 0; i < trades.length; i++) {
        const tradeAmount = trades[i];
        const wallet = this.config.wallets[i % this.config.wallets.length];

        try {
          await this.executeBuyTrade(wallet, tradeAmount);

          // Random delay before next trade (except for last trade)
          if (i < trades.length - 1) {
            const delaySec = this.randomBetween(
              this.config.minDelaySeconds,
              this.config.maxDelaySeconds
            );
            logger.debug(`⏳ Waiting ${delaySec}s before next trade...`);
            await this.sleep(delaySec * 1000);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`❌ Trade ${i + 1}/${trades.length} failed`, {
            amount: tradeAmount,
            error: errorMsg,
          });

          // Record failed trade
          this.stats.failedTrades++;
          this.stats.tradeHistory.push({
            timestamp: new Date(),
            wallet: wallet.publicKey.toString(),
            amountSol: tradeAmount,
            tokensReceived: 0,
            signature: '',
            success: false,
            error: errorMsg,
          });
        }
      }

      logger.info('✅ Volume creation complete', {
        totalVolume: this.stats.totalVolume,
        successfulTrades: this.stats.successfulTrades,
        failedTrades: this.stats.failedTrades,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Volume creation failed', { error: errorMsg });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a single buy trade
   */
  private async executeBuyTrade(
    wallet: Keypair,
    amountSol: number
  ): Promise<void> {
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    logger.info('💰 Executing buy trade', {
      wallet: wallet.publicKey.toString(),
      amountSol,
      lamports,
      dryRun: this.config.dryRun,
    });

    if (this.config.dryRun) {
      logger.info('🔵 DRY RUN: Would execute buy trade', {
        amountSol,
        wallet: wallet.publicKey.toString(),
      });

      // Simulate successful trade in dry run
      this.stats.totalVolume += amountSol;
      this.stats.tradeCount++;
      this.stats.successfulTrades++;
      this.stats.lastTradeTime = new Date();
      this.stats.tradeHistory.push({
        timestamp: new Date(),
        wallet: wallet.publicKey.toString(),
        amountSol,
        tokensReceived: 1000000, // Simulated
        signature: 'DRY_RUN_SIGNATURE',
        success: true,
      });

      return;
    }

    try {
      // Check SOL balance before trade
      const solBalance = await this.solanaService.getSolBalance(wallet.publicKey);
      const requiredSol = amountSol + 0.01; // Add buffer for fees

      if (solBalance < requiredSol) {
        throw new Error(
          `Insufficient SOL balance: ${solBalance.toFixed(4)} SOL, need ${requiredSol.toFixed(4)} SOL`
        );
      }

      // Get buyer's token account
      const buyerTokenAccount = await getAssociatedTokenAddress(
        this.config.tokenAddress,
        wallet.publicKey
      );

      // Check if ATA exists, get balance before trade
      let tokenBalanceBefore = 0;

      try {
        tokenBalanceBefore = await this.solanaService.getTokenBalance(
          wallet.publicKey,
          this.config.tokenAddress
        );
        logger.debug('Pre-trade token balance', { balance: tokenBalanceBefore });
      } catch (error) {
        // ATA doesn't exist yet, will be created by pump.fun
        logger.debug('ATA does not exist yet, will be created by trade');
      }

      // Build buy instruction
      const buyIx = await this.createBuyInstruction(
        wallet.publicKey,
        buyerTokenAccount,
        lamports
      );

      // Create and send transaction
      const transaction = new Transaction().add(buyIx);
      const signature = await this.txService.sendAndConfirm(
        transaction,
        [wallet]
      );

      // Get balance after trade to calculate actual tokens received
      const tokenBalanceAfter = await this.solanaService.getTokenBalance(
        wallet.publicKey,
        this.config.tokenAddress
      );

      const tokensReceived = tokenBalanceAfter - tokenBalanceBefore;

      // Update stats
      this.stats.totalVolume += amountSol;
      this.stats.tradeCount++;
      this.stats.successfulTrades++;
      this.stats.lastTradeTime = new Date();
      this.stats.tradeHistory.push({
        timestamp: new Date(),
        wallet: wallet.publicKey.toString(),
        amountSol,
        tokensReceived,
        signature,
        success: true,
      });

      logger.info('✅ Buy trade successful', {
        signature,
        amountSol,
        tokensReceived,
        balanceBefore: tokenBalanceBefore,
        balanceAfter: tokenBalanceAfter,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Buy trade failed', { error: errorMsg });
      throw error;
    }
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
   * Split total SOL into randomized trade amounts
   */
  private splitIntoTrades(totalSol: number): number[] {
    const trades: number[] = [];
    let remaining = totalSol;

    while (remaining > this.config.minTradeAmount) {
      // Random amount between min and max (or remaining if less)
      const maxForThisTrade = Math.min(this.config.maxTradeAmount, remaining);
      const amount = this.randomBetween(
        this.config.minTradeAmount,
        maxForThisTrade
      );

      trades.push(amount);
      remaining -= amount;
    }

    // Add remaining as final trade if significant
    if (remaining >= this.config.minTradeAmount / 2) {
      trades.push(remaining);
    } else if (trades.length > 0) {
      // Add remainder to last trade
      trades[trades.length - 1] += remaining;
    }

    return trades;
  }

  /**
   * Generate random number between min and max
   */
  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current stats
   */
  getStats(): VolumeStats {
    return {
      ...this.stats,
      tradeHistory: [...this.stats.tradeHistory],
    };
  }
}
