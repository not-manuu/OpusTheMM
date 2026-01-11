/**
 * WhaleMarket - Autonomous Market Maker Engine
 *
 * Integrates all modules and manages the bot lifecycle:
 * - Fee collection (opus - Decision Brain)
 * - Volume creation (sonnet - Fast execution)
 * - Buyback & burn (haiku - Precise burns)
 * - Airdrop distribution (claude - Distribution)
 * - Treasury transfers
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
import { DecisionEngine } from './ai';
import { wsManager } from './api/websocket/events';
import { setTestDecisionEngine } from './api/routes/control';
import * as ascii from './utils/asciiDisplay';

class TokenomicsBot {
  private solanaService!: SolanaService;
  private transactionService!: TransactionService;
  private feeCollector!: FeeCollector;
  private volumeCreator!: VolumeCreator;
  private buybackBurner!: BuybackBurner;
  private airdropDistributor!: AirdropDistributor;
  private apiServer!: ApiServer;
  private decisionEngine?: DecisionEngine;

  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;
  private startTime: Date | null = null;

  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Frostbyte...');

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

      logger.info('✅ All Frostbyte modules initialized');

      // Initialize AI Decision Engine if API key is provided
      if (config.anthropicApiKey) {
        this.decisionEngine = new DecisionEngine(
          tokenAddress,
          bondingCurveAddress,
          this.solanaService,
          {
            enabled: config.aiEnabled ?? true,
            anthropicApiKey: config.anthropicApiKey,
            birdeyeApiKey: config.birdeyeApiKey,
            minDecisionInterval: config.aiMinDecisionInterval ?? 60000,
            model: config.aiModel ?? 'claude-sonnet-4-20250514',
            maxTokens: config.aiMaxTokens ?? 4096,
          }
        );

        // Wire up WebSocket callbacks for real-time AI updates
        this.decisionEngine.setCallbacks({
          onThinkingStart: () => {
            wsManager.broadcastThinkingStart();
            // Terminal ASCII output
            ascii.displayThinkingSequence('start');
          },
          onThinkingSection: (section) => {
            wsManager.broadcastThinkingSection(section);
            // Terminal status based on section
            if (section === 'market_analysis') {
              ascii.displayThinkingSequence('analyzing');
            } else if (section === 'decision') {
              ascii.displayThinkingSequence('deciding');
            }
          },
          onThinkingChunk: (chunk) => wsManager.broadcastThinkingChunk(chunk),
          onThinkingComplete: (decision) => {
            wsManager.broadcastThinkingComplete(decision);
            // Terminal ASCII output
            ascii.displayThinkingSequence('complete');
            ascii.displayDecisionSummary({
              allocations: decision.allocation,
              confidence: decision.confidence,
              sentiment: decision.reasoning.sentiment,
              reasoning: decision.reasoning.decision,
            });
          },
          onThinkingError: (error) => wsManager.broadcastThinkingError(error),
          onDecision: (decision) => wsManager.broadcastAIDecision(decision),
          onMarketData: (data) => {
            wsManager.broadcastMarketData(data);
            // Terminal status bar
            ascii.displayStatusBar(
              config.aiModel ?? 'opus-4',
              data.price?.current?.toFixed(6) ?? '0',
              config.dryRun ? 'DRY RUN' : 'LIVE'
            );
          },
          // Consciousness stream callbacks
          onConsciousness: (thought) => {
            wsManager.broadcastConsciousness(thought);
            // Terminal thought output
            ascii.displayThought(thought.type, thought.message);
          },
          onMindStream: (thought) => {
            wsManager.broadcastMindStream(thought);
            // Terminal thinking box for all mind stream thoughts
            ascii.displayThinkingBox(thought.content);
          },
        });

        // Wire up test endpoint for AI
        setTestDecisionEngine(this.decisionEngine);

        logger.info('✅ AI Decision Engine initialized', {
          model: config.aiModel ?? 'claude-sonnet-4-20250514',
          enabled: config.aiEnabled ?? true,
        });
      } else {
        logger.info('ℹ️ AI Decision Engine disabled (no ANTHROPIC_API_KEY)');
      }

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

    // Connect AI Decision Engine if available
    if (this.decisionEngine) {
      this.feeCollector.setDecisionEngine(this.decisionEngine);
    }
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
    // Display the big ASCII OpenCode banner
    ascii.displayStartupBanner({
      model: config.aiModel ?? 'opus-4',
      token: config.tokenAddress,
      bondingCurve: config.bondingCurveAddress || 'Not set',
      dryRun: config.dryRun,
    });

    // Log additional info for structured logging
    logger.info(`API Server: http://localhost:${config.apiPort}`);
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
    const aiStats = this.decisionEngine?.getStats();

    ascii.separator();
    console.log('\x1b[1m   📊 HOURLY STATUS REPORT\x1b[0m');
    ascii.separator();
    console.log(`   \x1b[36m⚡ sonnet\x1b[0m  │ Volume: ${volumeStats.totalVolume.toFixed(6)} SOL (${volumeStats.successfulTrades}/${volumeStats.tradeCount} trades)`);
    console.log(`   \x1b[31m🔥 haiku\x1b[0m   │ Burned: ${burnStats.totalBurned.toLocaleString()} tokens (${burnStats.totalSolSpent.toFixed(6)} SOL)`);
    console.log(`   \x1b[35m🎁 claude\x1b[0m  │ Airdrops: ${airdropStats.totalDistributed.toFixed(6)} SOL to ${airdropStats.uniqueRecipients.size} holders`);
    console.log(`   \x1b[33m💰 treasury\x1b[0m│ Fees: ${feeStats.totalCollected.toFixed(6)} SOL (${feeStats.claimCount} claims)`);
    if (aiStats) {
      console.log(`   \x1b[32m🧠 opus\x1b[0m    │ Decisions: ${aiStats.totalDecisions} (${aiStats.lastSentiment || 'N/A'}, ${aiStats.lastConfidence ?? 'N/A'}% confidence)`);
    }
    ascii.separator();
    console.log('');
  }

  private generateShutdownSummary(): void {
    const feeStats = this.feeCollector.getStats();
    const volumeStats = this.volumeCreator.getStats();
    const burnStats = this.buybackBurner.getStats();
    const airdropStats = this.airdropDistributor.getStats();
    const treasuryStats = this.feeCollector.getTreasuryStats();
    const aiStats = this.decisionEngine?.getStats();

    const uptime = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    console.log('');
    console.log('\x1b[36m\x1b[1m╔═══════════════════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m\x1b[1m║                    🐋 WHALEMARKET SESSION SUMMARY 🐋                       ║\x1b[0m');
    console.log('\x1b[36m\x1b[1m╚═══════════════════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    console.log(`   \x1b[1mUPTIME:\x1b[0m ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`);
    console.log('');

    if (aiStats) {
      console.log('   \x1b[32m┌─ opus (Decision Brain) ─────────────────────────────┐\x1b[0m');
      console.log(`   \x1b[32m│\x1b[0m  Total Decisions: ${aiStats.totalDecisions}`);
      console.log(`   \x1b[32m│\x1b[0m  Last Sentiment:  ${aiStats.lastSentiment || 'N/A'}`);
      console.log(`   \x1b[32m│\x1b[0m  Last Confidence: ${aiStats.lastConfidence ?? 'N/A'}%`);
      console.log('   \x1b[32m└─────────────────────────────────────────────────────┘\x1b[0m');
      console.log('');
    }

    console.log('   \x1b[36m┌─ sonnet (Volume Creation) ─────────────────────────┐\x1b[0m');
    console.log(`   \x1b[36m│\x1b[0m  Total Volume: ${volumeStats.totalVolume.toFixed(6)} SOL`);
    console.log(`   \x1b[36m│\x1b[0m  Trades:       ${volumeStats.successfulTrades}/${volumeStats.tradeCount}`);
    console.log('   \x1b[36m└─────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');

    console.log('   \x1b[31m┌─ haiku (Buyback & Burn) ────────────────────────────┐\x1b[0m');
    console.log(`   \x1b[31m│\x1b[0m  Tokens Burned: ${burnStats.totalBurned.toLocaleString()}`);
    console.log(`   \x1b[31m│\x1b[0m  SOL Spent:     ${burnStats.totalSolSpent.toFixed(6)}`);
    console.log('   \x1b[31m└─────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');

    console.log('   \x1b[35m┌─ claude (Airdrop Distribution) ────────────────────┐\x1b[0m');
    console.log(`   \x1b[35m│\x1b[0m  Total Distributed: ${airdropStats.totalDistributed.toFixed(6)} SOL`);
    console.log(`   \x1b[35m│\x1b[0m  Unique Recipients: ${airdropStats.uniqueRecipients.size}`);
    console.log('   \x1b[35m└─────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');

    console.log('   \x1b[33m┌─ treasury ─────────────────────────────────────────┐\x1b[0m');
    console.log(`   \x1b[33m│\x1b[0m  Total Transferred: ${treasuryStats.totalReceived.toFixed(6)} SOL`);
    console.log(`   \x1b[33m│\x1b[0m  Fees Collected:    ${feeStats.totalCollected.toFixed(6)} SOL (${feeStats.claimCount} claims)`);
    console.log('   \x1b[33m└─────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');
    ascii.separator();
    console.log('');
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

    console.log('\x1b[32m\x1b[1m   🐋 WhaleMarket is running. Press Ctrl+C to stop.\x1b[0m');
    console.log('');
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
