# Phase 7: Main Bot Orchestrator

## Objective
Integrate all modules into a cohesive, production-ready bot with health monitoring, graceful shutdown, and comprehensive logging.

---

## Prompt for Claude

```
Build the main orchestrator that integrates all tokenomics modules and manages the bot lifecycle.

BUILD: src/main.ts

CONTEXT:
This is the entry point that ties everything together. It initializes all modules, starts the fee collection loop, handles errors gracefully, and provides clean shutdown capabilities.

REQUIREMENTS:

1. Module Initialization
   - Load configuration from environment
   - Initialize Solana services
   - Create all tokenomics modules
   - Validate setup before starting

2. Lifecycle Management
   - Start all necessary processes
   - Monitor health of each module
   - Handle graceful shutdown (SIGINT, SIGTERM)
   - Cleanup resources on exit

3. Error Handling
   - Catch and log all errors
   - Prevent crashes from individual module failures
   - Implement circuit breakers
   - Alert on critical failures

4. Health Monitoring
   - Track module status
   - Monitor RPC connection
   - Check wallet balances
   - Log system metrics

5. Reporting
   - Periodic status reports
   - Daily summaries
   - Export statistics
   - Dashboard data generation

MAIN STRUCTURE:

```typescript
// src/main.ts
import { SolanaService } from './services/solanaService';
import { TransactionService } from './services/transactionService';
import { FeeCollector } from './modules/feeCollector';
import { VolumeCreator } from './modules/volumeCreator';
import { BuybackBurner } from './modules/buybackBurn';
import { AirdropDistributor } from './modules/airdropDistributor';
import { LiquidityInjector } from './modules/liquidityInjector';
import { config } from './config/env';
import { logger } from './utils/logger';

class TokenomicsBot {
  private solanaService!: SolanaService;
  private transactionService!: TransactionService;
  // 🎅 Santa
  private feeCollector!: FeeCollector;

  // 🦌 The 4 Reindeer
  private volumeCreator!: VolumeCreator;        // Reindeer 1
  private buybackBurner!: BuybackBurner;        // Reindeer 2
  private airdropDistributor!: AirdropDistributor;  // Reindeer 3
  // Reindeer 4 (Treasury) is handled by FeeCollector

  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;

  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Tokenomics Bot...');

    try {
      // Initialize Solana services
      this.solanaService = new SolanaService(
        config.rpcEndpoint,
        config.rpcWebsocketEndpoint
      );

      this.transactionService = new TransactionService(this.solanaService);

      logger.info('✅ Solana services initialized');

      // Check connection
      const healthy = await this.solanaService.checkConnectionHealth();
      if (!healthy) {
        throw new Error('RPC connection unhealthy');
      }

      logger.info('✅ RPC connection healthy');

      // Load wallets
      const creatorWallet = this.solanaService.loadWallet(config.creatorPrivateKey);
      const volumeWallets = this.solanaService.loadMultipleWallets(
        config.volumeWalletKeys
      );
      const burnWallet = this.solanaService.loadWallet(config.burnWalletPrivateKey);

      logger.info('✅ Wallets loaded', {
        creator: creatorWallet.publicKey.toString(),
        volumeWallets: volumeWallets.length,
        burn: burnWallet.publicKey.toString(),
      });

      // Initialize modules
      this.feeCollector = new FeeCollector(
        {
          tokenAddress: config.tokenAddress,
          bondingCurveAddress: config.bondingCurveAddress,
          creatorWallet,
          minimumClaimThreshold: config.minimumClaimThreshold,
          checkInterval: config.feeCheckInterval,
          distributionPercentages: {
            volume: 25,    // Reindeer 1
            buyback: 25,   // Reindeer 2
            airdrop: 25,   // Reindeer 3
            treasury: 25,  // Reindeer 4
          },
        },
        this.solanaService,
        this.transactionService
      );

      this.volumeCreator = new VolumeCreator(
        {
          tokenAddress: config.tokenAddress,
          bondingCurveAddress: config.bondingCurveAddress,
          associatedBondingCurve: config.associatedBondingCurve,
          volumeWallets,
          minTradeAmount: 0.001,
          maxTradeAmount: 0.05,
          minDelaySeconds: 5,
          maxDelaySeconds: 30,
          slippageBps: 300,
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService
      );

      this.buybackBurner = new BuybackBurner(
        {
          tokenAddress: config.tokenAddress,
          bondingCurveAddress: config.bondingCurveAddress,
          associatedBondingCurve: config.associatedBondingCurve,
          burnWallet,
          burnMethod: 'burn',
          slippageBps: 300,
          dryRun: config.dryRun,
          maxBurnPerTx: 1000000000, // 1B tokens
        },
        this.solanaService,
        this.transactionService
      );

      this.airdropDistributor = new AirdropDistributor(
        {
          tokenAddress: config.tokenAddress,
          distributorWallet: creatorWallet,
          minHoldingThreshold: config.minHolderThreshold,
          minAirdropAmount: 0.001,
          maxRecipientsPerRun: 100,
          excludeAddresses: [burnWallet.publicKey.toString()],
          dryRun: config.dryRun,
        },
        this.solanaService,
        this.transactionService
      );

      logger.info('✅ All 4 Reindeer initialized');

      // Wire up modules to fee collector
      this.wireModules();

      logger.info('✅ Modules wired to fee collector');

    } catch (error) {
      logger.error('Failed to initialize bot', { error });
      throw error;
    }
  }

  private wireModules(): void {
    // 🎅 Wire Santa to the 4 Reindeer
    (this.feeCollector as any).volumeCreator = this.volumeCreator;        // Reindeer 1
    (this.feeCollector as any).buybackBurner = this.buybackBurner;        // Reindeer 2
    (this.feeCollector as any).airdropDistributor = this.airdropDistributor;  // Reindeer 3
    // Reindeer 4 (Treasury) is handled internally by FeeCollector
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot already running');
      return;
    }

    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('  🎅 SANTA & THE 4 REINDEER');
    logger.info('═══════════════════════════════════════════');
    logger.info('');
    logger.info('Token:', config.tokenAddress);
    logger.info('Bonding Curve:', config.bondingCurveAddress);
    logger.info('');
    logger.info('🎅 Santa (Fee Collector):');
    logger.info('  Monitors and collects creator fees');
    logger.info('');
    logger.info('The 4 Reindeer:');
    logger.info('  🦌 Reindeer 1: 25% → Volume Creation');
    logger.info('  🦌 Reindeer 2: 25% → Buyback & Burn');
    logger.info('  🦌 Reindeer 3: 25% → Holder Airdrops');
    logger.info('  🦌 Reindeer 4: 25% → Treasury');
    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('');

    this.isRunning = true;

    try {
      // Start fee collector (main loop)
      await this.feeCollector.start();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start periodic reports
      this.startPeriodicReports();

      logger.info('✅ Bot started successfully');

    } catch (error) {
      logger.error('Failed to start bot', { error });
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
      // Stop fee collector
      await this.feeCollector.stop();

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      logger.info('✅ Bot stopped gracefully');

    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }

  private startHealthMonitoring(): void {
    // Health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, 5 * 60 * 1000);
  }

  private async performHealthCheck(): Promise<void> {
    logger.debug('🏥 Performing health check...');

    // Check RPC connection
    const rpcHealthy = await this.solanaService.checkConnectionHealth();
    if (!rpcHealthy) {
      logger.error('⚠️ RPC connection unhealthy!');
    }

    // Check wallet balances
    const creatorBalance = await this.solanaService.getSolBalance(
      this.solanaService.loadWallet(config.creatorPrivateKey).publicKey
    );

    if (creatorBalance < 0.01) {
      logger.warn('⚠️ Low creator wallet balance', { balance: creatorBalance });
    }

    // Check fee collector status
    const feeStats = this.feeCollector.getStats();
    logger.debug('Fee Collector Status', {
      totalCollected: feeStats.totalCollected,
      claimCount: feeStats.claimCount,
      lastClaim: feeStats.lastClaimTime,
    });

    logger.debug('✅ Health check complete');
  }

  private startPeriodicReports(): void {
    // Daily summary report
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.generateDailySummary();

      // Then every 24 hours
      setInterval(() => {
        this.generateDailySummary();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private generateDailySummary(): void {
    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('  📊 SANTA\'S DAILY REPORT');
    logger.info('═══════════════════════════════════════════');

    const feeStats = this.feeCollector.getStats();
    const volumeStats = this.volumeCreator.getStats();
    const burnStats = this.buybackBurner.getStats();
    const airdropStats = this.airdropDistributor.getStats();

    logger.info('');
    logger.info('🎅 Santa (Fee Collection):');
    logger.info(`  Total Collected: ${feeStats.totalCollected.toFixed(4)} SOL`);
    logger.info(`  Claim Count: ${feeStats.claimCount}`);
    logger.info(`  Distributions: ${feeStats.distributionHistory.length}`);

    logger.info('');
    logger.info('🦌 Reindeer 1 (Volume Creation):');
    logger.info(`  Total Volume: ${volumeStats.totalVolume.toFixed(4)} SOL`);
    logger.info(`  Trades: ${volumeStats.tradeCount}`);
    logger.info(`  Success Rate: ${((volumeStats.successfulTrades / volumeStats.tradeCount) * 100).toFixed(1)}%`);

    logger.info('');
    logger.info('🦌 Reindeer 2 (Buyback & Burn):');
    logger.info(`  Total Burned: ${burnStats.totalTokensBurned.toLocaleString()} tokens`);
    logger.info(`  SOL Spent: ${burnStats.totalSolSpent.toFixed(4)} SOL`);
    logger.info(`  Burn Count: ${burnStats.burnCount}`);

    logger.info('');
    logger.info('🦌 Reindeer 3 (Airdrops):');
    logger.info(`  Total Distributed: ${airdropStats.totalDistributed.toFixed(4)} SOL`);
    logger.info(`  Recipients: ${airdropStats.totalRecipients}`);
    logger.info(`  Average per Holder: ${airdropStats.averagePerHolder.toFixed(6)} SOL`);

    logger.info('');
    logger.info('🦌 Reindeer 4 (Treasury):');
    const treasuryAmount = feeStats.totalCollected * 0.25;
    logger.info(`  Total Transferred: ${treasuryAmount.toFixed(4)} SOL`);

    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('');
  }
}

// Main execution
async function main() {
  const bot = new TokenomicsBot();

  // Handle graceful shutdown
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

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
  });

  try {
    // Initialize and start
    await bot.initialize();
    await bot.start();

    logger.info('Bot is running. Press Ctrl+C to stop.');

  } catch (error) {
    logger.error('Fatal error during startup', { error });
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}

export { TokenomicsBot };
```

ENVIRONMENT CONFIGURATION:

```typescript
// src/config/env.ts
import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';

dotenv.config();

interface Config {
  // RPC
  rpcEndpoint: string;
  rpcWebsocketEndpoint: string;

  // Wallets
  creatorPrivateKey: string;
  volumeWalletKeys: string[];
  burnWalletPrivateKey: string;

  // Token
  tokenAddress: string;
  bondingCurveAddress: string;
  associatedBondingCurve: PublicKey;
  poolAddress?: string;

  // Thresholds
  minimumClaimThreshold: number;
  minHolderThreshold: number;

  // Timing
  feeCheckInterval: number;

  // Mode
  dryRun: boolean;
  logLevel: string;
}

function validateEnv(): Config {
  const required = [
    'RPC_ENDPOINT',
    'CREATOR_PRIVATE_KEY',
    'VOLUME_WALLET_KEYS',
    'BURN_WALLET_PRIVATE_KEY',
    'TOKEN_ADDRESS',
    'BONDING_CURVE_ADDRESS',
    'ASSOCIATED_BONDING_CURVE',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    rpcEndpoint: process.env.RPC_ENDPOINT!,
    rpcWebsocketEndpoint: process.env.RPC_WEBSOCKET_ENDPOINT || process.env.RPC_ENDPOINT!,
    creatorPrivateKey: process.env.CREATOR_PRIVATE_KEY!,
    volumeWalletKeys: process.env.VOLUME_WALLET_KEYS!.split(',').map(k => k.trim()),
    burnWalletPrivateKey: process.env.BURN_WALLET_PRIVATE_KEY!,
    tokenAddress: process.env.TOKEN_ADDRESS!,
    bondingCurveAddress: process.env.BONDING_CURVE_ADDRESS!,
    associatedBondingCurve: new PublicKey(process.env.ASSOCIATED_BONDING_CURVE!),
    poolAddress: process.env.POOL_ADDRESS,
    minimumClaimThreshold: parseFloat(process.env.MINIMUM_CLAIM_THRESHOLD || '0.01'),
    minHolderThreshold: parseInt(process.env.MIN_HOLDER_THRESHOLD || '1000000'),
    feeCheckInterval: parseInt(process.env.FEE_CHECK_INTERVAL || '30000'),
    dryRun: process.env.DRY_RUN === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

export const config = validateEnv();
```

ERROR HANDLING:
- Catch all errors at module boundaries
- Log with full context
- Prevent cascading failures
- Implement circuit breakers for RPC

LOGGING:
- Structured logging with winston
- Different log levels (debug, info, warn, error)
- File rotation
- Console and file outputs

MONITORING:
- Health checks every 5 minutes
- Wallet balance monitoring
- Module status tracking
- Daily summaries

```

---

## Success Criteria

- [ ] Main orchestrator implemented
- [ ] All modules integrate correctly
- [ ] Bot starts and runs continuously
- [ ] Graceful shutdown works (Ctrl+C)
- [ ] Health monitoring functions
- [ ] Daily summaries generated
- [ ] Error handling prevents crashes
- [ ] Environment validation works

---

## Testing Strategy

1. **Dry-Run Mode**:
   ```bash
   DRY_RUN=true npm start
   ```
   - Verify all modules initialize
   - Check logs for proper flow
   - No actual transactions sent

2. **Devnet Testing**:
   - Use devnet RPC and test token
   - Run for 1 hour
   - Verify all operations

3. **Mainnet Testing**:
   - Start with small amounts
   - Monitor for 24 hours
   - Check all distributions work

---

## Production Checklist

Before deploying:
- [ ] All environment variables set
- [ ] RPC provider configured (paid plan)
- [ ] Wallets funded with SOL
- [ ] Dry-run mode tested thoroughly
- [ ] Logging configured properly
- [ ] Error alerting set up
- [ ] Backup of private keys secured
- [ ] Emergency shutdown procedure documented

---

## Running the Bot

```bash
# Development
npm run dev

# Production (after build)
npm start

# With PM2 (recommended for production)
pm2 start dist/main.js --name tokenomics-bot

# View logs
pm2 logs tokenomics-bot

# Stop
pm2 stop tokenomics-bot
```

---

## Next Phase

After implementing the main orchestrator, proceed to:
👉 **Phase 8**: `08-testing-deployment.md`

---

## Questions to Resolve

1. Should we use PM2 for process management?
2. What alerting system for critical errors? (email, Telegram, Discord?)
3. Should stats be exported to a database or just logs/files?
4. How often should daily summaries be generated?
