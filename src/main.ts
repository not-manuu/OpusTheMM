/**
 * 🎅 Santa's Tokenomics Bot - Main Orchestrator
 *
 * Integrates all modules and manages the bot lifecycle:
 * - Fee collection (Santa)
 * - Volume creation (Reindeer 1)
 * - Buyback & burn (Reindeer 2)
 * - Airdrop distribution (Reindeer 3)
 * - Treasury transfers (Reindeer 4)
 */

import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './services/solanaService';
import { TransactionService } from './services/transactionService';
import { FeeCollector } from './modules/feeCollector';
import { VolumeCreator } from './modules/volumeCreator';
import { BuybackBurner } from './modules/buybackBurn';
import { AirdropDistributor } from './modules/airdropDistributor';
import { ApiServer } from './api/server';
import { statsService } from './api/services/statsService';
import { config } from './config/env';
import { logger } from './utils/logger';
import { BURN_ADDRESS } from './config/constants';

class TokenomicsBot {
  private solanaService!: SolanaService;
  private transactionService!: TransactionService;
  private feeCollector!: FeeCollector;
  private volumeCreator!: VolumeCreator;
  private buybackBurner!: BuybackBurner;
  private airdropDistributor!: AirdropDistributor;
  private apiServer!: ApiServer;

  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;
  private startTime: Date | null = null;

  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Tokenomics Bot...');

    try {
      this.solanaService = new SolanaService(
        config.rpcEndpoint,
        config.rpcWebsocketEndpoint
      );

      this.transactionService = new TransactionService(this.solanaService);

      logger.info('✅ Solana services initialized');

      const healthy = await this.solanaService.checkConnectionHealth();
      if (!healthy) {
        throw new Error('RPC connection unhealthy');
      }

      logger.info('✅ RPC connection healthy');

      const creatorWallet = this.solanaService.loadWallet(config.creatorPrivateKey);
      const volumeWallets = this.solanaService.loadMultipleWallets(config.volumeWalletKeys);
      const burnWallet = this.solanaService.loadWallet(config.burnWalletPrivateKey);

      logger.info('✅ Wallets loaded', {
        creator: creatorWallet.publicKey.toString(),
        volumeWallets: volumeWallets.length,
        burn: burnWallet.publicKey.toString(),
      });

      const tokenAddress = new PublicKey(config.tokenAddress);
      const bondingCurveAddress = config.bondingCurveAddress
        ? new PublicKey(config.bondingCurveAddress)
        : new PublicKey('11111111111111111111111111111111');
      const associatedBondingCurve = config.associatedBondingCurve
        ? new PublicKey(config.associatedBondingCurve)
        : new PublicKey('11111111111111111111111111111111');
      const treasuryWalletAddress = config.treasuryWalletAddress
        ? new PublicKey(config.treasuryWalletAddress)
        : creatorWallet.publicKey;

      this.feeCollector = new FeeCollector(
        {
          tokenAddress,
          bondingCurveAddress,
          associatedBondingCurve,
          creatorWallet,
          minimumClaimThreshold: config.minimumClaimThreshold,
          checkInterval: config.feeCheckInterval,
          distributionPercentages: {
            volume: 25,
            buyback: 25,
            airdrop: 25,
            treasury: 25,
          },
          treasuryWalletAddress,
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService
      );

      this.volumeCreator = new VolumeCreator(
        {
          tokenAddress,
          bondingCurveAddress,
          associatedBondingCurve,
          wallets: volumeWallets,
          minTradeAmount: config.minTradeAmount,
          maxTradeAmount: config.maxTradeAmount,
          minDelaySeconds: config.minDelaySeconds,
          maxDelaySeconds: config.maxDelaySeconds,
          slippageBps: config.slippageBps,
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService
      );

      this.buybackBurner = new BuybackBurner(
        {
          tokenAddress,
          bondingCurveAddress,
          associatedBondingCurve,
          burnWallet,
          slippageBps: config.slippageBps,
          maxBurnPerTx: config.maxBurnPerTx,
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService
      );

      this.airdropDistributor = new AirdropDistributor(
        {
          tokenAddress,
          payerWallet: creatorWallet,
          minHolderThreshold: config.minHolderThreshold,
          minAirdropAmount: config.minAirdropAmount,
          maxRecipientsPerRun: config.maxRecipientsPerRun,
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService,
        [burnWallet.publicKey.toString(), BURN_ADDRESS.toString()]
      );

      logger.info('✅ All 4 Reindeer initialized');

      this.wireModules();

      logger.info('✅ Modules wired to fee collector');

      this.apiServer = new ApiServer(config.apiPort);
      this.apiServer.setSolanaService(this.solanaService);

      statsService.setModules({
        feeCollector: this.feeCollector,
        volumeCreator: this.volumeCreator,
        buybackBurner: this.buybackBurner,
        airdropDistributor: this.airdropDistributor,
      });

      logger.info('✅ API server initialized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to initialize bot', { error: errorMsg });
      throw error;
    }
  }

  private wireModules(): void {
    this.feeCollector.setVolumeCreator(this.volumeCreator);
    this.feeCollector.setBuybackBurner(this.buybackBurner);
    this.feeCollector.setAirdropDistributor(this.airdropDistributor);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot already running');
      return;
    }

    this.printBanner();

    this.isRunning = true;
    this.startTime = new Date();

    try {
      await this.feeCollector.start();

      await this.apiServer.start();

      this.startHealthMonitoring();

      this.startPeriodicReports();

      logger.info('✅ Bot started successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start bot', { error: errorMsg });
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Bot not running');
      return;
    }

    logger.info('🛑 Stopping bot...');

    this.isRunning = false;

    try {
      await this.feeCollector.stop();

      await this.apiServer.stop();

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      if (this.reportInterval) {
        clearInterval(this.reportInterval);
        this.reportInterval = undefined;
      }

      this.generateShutdownSummary();

      logger.info('✅ Bot stopped gracefully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during shutdown', { error: errorMsg });
    }
  }

  private printBanner(): void {
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  🎅 SANTA\'S TOKENOMICS BOT - THE 4 REINDEER');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info(`Token: ${config.tokenAddress}`);
    logger.info(`Bonding Curve: ${config.bondingCurveAddress || 'Not set'}`);
    logger.info(`Dry Run: ${config.dryRun}`);
    logger.info('');
    logger.info('🎅 Santa (Fee Collector):');
    logger.info('   Monitors and collects creator fees from pump.fun');
    logger.info('');
    logger.info('The 4 Reindeer:');
    logger.info('   🦌 Reindeer 1: 25% → Volume Creation');
    logger.info('   🦌 Reindeer 2: 25% → Buyback & Burn');
    logger.info('   🦌 Reindeer 3: 25% → Holder Airdrops');
    logger.info('   🦌 Reindeer 4: 25% → Treasury');
    logger.info('');
    logger.info(`API Server: http://localhost:${config.apiPort}`);
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Health check failed', { error: errorMsg });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async performHealthCheck(): Promise<void> {
    logger.debug('🏥 Performing health check...');

    const rpcHealthy = await this.solanaService.checkConnectionHealth();
    if (!rpcHealthy) {
      logger.error('⚠️ RPC connection unhealthy!');
    }

    const creatorWallet = this.solanaService.loadWallet(config.creatorPrivateKey);
    const creatorBalance = await this.solanaService.getSolBalance(creatorWallet.publicKey);

    if (creatorBalance < 0.01) {
      logger.warn('⚠️ Low creator wallet balance', { balance: creatorBalance });
    }

    const feeStats = this.feeCollector.getStats();
    logger.debug('Fee Collector Status', {
      totalCollected: feeStats.totalCollected,
      claimCount: feeStats.claimCount,
      lastClaim: feeStats.lastClaimTime,
    });

    logger.debug('✅ Health check complete');
  }

  private startPeriodicReports(): void {
    this.reportInterval = setInterval(() => {
      this.generateHourlySummary();
    }, 60 * 60 * 1000); // Every hour
  }

  private generateHourlySummary(): void {
    const feeStats = this.feeCollector.getStats();
    const volumeStats = this.volumeCreator.getStats();
    const burnStats = this.buybackBurner.getStats();
    const airdropStats = this.airdropDistributor.getStats();

    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('  📊 HOURLY STATUS REPORT');
    logger.info('═══════════════════════════════════════════');
    logger.info(`🎅 Fees Collected: ${feeStats.totalCollected.toFixed(6)} SOL (${feeStats.claimCount} claims)`);
    logger.info(`🦌 Volume Created: ${volumeStats.totalVolume.toFixed(6)} SOL (${volumeStats.successfulTrades}/${volumeStats.tradeCount} trades)`);
    logger.info(`🔥 Tokens Burned: ${burnStats.totalBurned.toLocaleString()} (${burnStats.totalSolSpent.toFixed(6)} SOL)`);
    logger.info(`🎁 Airdrops: ${airdropStats.totalDistributed.toFixed(6)} SOL to ${airdropStats.uniqueRecipients.size} holders`);
    logger.info('═══════════════════════════════════════════');
    logger.info('');
  }

  private generateShutdownSummary(): void {
    const feeStats = this.feeCollector.getStats();
    const volumeStats = this.volumeCreator.getStats();
    const burnStats = this.buybackBurner.getStats();
    const airdropStats = this.airdropDistributor.getStats();
    const treasuryStats = this.feeCollector.getTreasuryStats();

    const uptime = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  🎅 SANTA\'S SESSION SUMMARY');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info(`Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`);
    logger.info('');
    logger.info('🎅 Fee Collection:');
    logger.info(`   Total Collected: ${feeStats.totalCollected.toFixed(6)} SOL`);
    logger.info(`   Claim Count: ${feeStats.claimCount}`);
    logger.info('');
    logger.info('🦌 Reindeer 1 (Volume):');
    logger.info(`   Total Volume: ${volumeStats.totalVolume.toFixed(6)} SOL`);
    logger.info(`   Trades: ${volumeStats.successfulTrades}/${volumeStats.tradeCount}`);
    logger.info('');
    logger.info('🦌 Reindeer 2 (Buyback & Burn):');
    logger.info(`   Tokens Burned: ${burnStats.totalBurned.toLocaleString()}`);
    logger.info(`   SOL Spent: ${burnStats.totalSolSpent.toFixed(6)}`);
    logger.info('');
    logger.info('🦌 Reindeer 3 (Airdrops):');
    logger.info(`   Total Distributed: ${airdropStats.totalDistributed.toFixed(6)} SOL`);
    logger.info(`   Unique Recipients: ${airdropStats.uniqueRecipients.size}`);
    logger.info('');
    logger.info('🦌 Reindeer 4 (Treasury):');
    logger.info(`   Total Transferred: ${treasuryStats.totalReceived.toFixed(6)} SOL`);
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getUptime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }
}

async function main(): Promise<void> {
  const bot = new TokenomicsBot();

  process.on('SIGINT', async () => {
    logger.info('');
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('');
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    logger.error('Unhandled rejection', { reason: errorMsg });
    process.exit(1);
  });

  try {
    await bot.initialize();
    await bot.start();

    logger.info('🎅 Bot is running. Press Ctrl+C to stop.');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Fatal error during startup', { error: errorMsg });
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Fatal error', { error: errorMsg });
    process.exit(1);
  });
}

export { TokenomicsBot };
