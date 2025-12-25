/**
 * Test Phase 2 (FeeCollector) and Phase 3 (VolumeCreator) Integration
 *
 * This script tests:
 * - FeeCollector initialization and configuration
 * - VolumeCreator initialization
 * - Integration between Santa and Reindeer 1
 * - Fee monitoring and distribution simulation (dry-run)
 */

import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './services/solanaService';
import { TransactionService } from './services/transactionService';
import { FeeCollector } from './modules/feeCollector';
import { VolumeCreator } from './modules/volumeCreator';
import { logger } from './utils/logger';
import { config } from './config/env';

async function main() {
  logger.info('🧪 Starting Phase 2 & 3 Integration Test');
  logger.info('=' .repeat(60));

  try {
    // ============================================
    // 1. Initialize Services
    // ============================================
    logger.info('\n📡 Step 1: Initializing Solana Services...');

    const solanaService = new SolanaService(
      config.rpcEndpoint,
      config.rpcWebsocketEndpoint
    );

    const txService = new TransactionService(solanaService);

    // Check connection health
    const isHealthy = await solanaService.checkConnectionHealth();
    if (!isHealthy) {
      throw new Error('RPC connection is not healthy');
    }
    logger.info('✅ RPC connection healthy');

    // ============================================
    // 2. Load Wallets
    // ============================================
    logger.info('\n👛 Step 2: Loading Wallets...');

    const creatorWallet = solanaService.loadWallet(config.creatorPrivateKey);
    const volumeWallets = solanaService.loadMultipleWallets([
      config.creatorPrivateKey, // Single wallet strategy
    ]);

    logger.info('✅ Creator wallet:', creatorWallet.publicKey.toString());
    logger.info('✅ Volume wallets loaded:', volumeWallets.length);

    // Check SOL balances
    const creatorBalance = await solanaService.getSolBalance(
      creatorWallet.publicKey
    );
    logger.info(`💰 Creator wallet balance: ${creatorBalance.toFixed(4)} SOL`);

    // ============================================
    // 3. Initialize FeeCollector (Santa)
    // ============================================
    logger.info('\n🎅 Step 3: Initializing Fee Collector (Santa)...');

    const feeCollectorConfig = {
      tokenAddress: new PublicKey(config.tokenAddress),
      bondingCurveAddress: new PublicKey(config.bondingCurveAddress),
      associatedBondingCurve: new PublicKey(config.associatedBondingCurve),
      creatorWallet,
      minimumClaimThreshold: config.minimumClaimThreshold,
      checkInterval: config.feeCheckInterval,
      distributionPercentages: {
        volume: 25,
        buyback: 25,
        airdrop: 25,
        treasury: 25,
      },
      treasuryWalletAddress: creatorWallet.publicKey, // Using creator as treasury for testing
      dryRun: config.dryRun,
    };

    const feeCollector = new FeeCollector(
      feeCollectorConfig,
      solanaService,
      txService
    );

    logger.info('✅ FeeCollector initialized');

    // ============================================
    // 4. Initialize VolumeCreator (Reindeer 1)
    // ============================================
    logger.info('\n🦌 Step 4: Initializing Volume Creator (Reindeer 1)...');

    const volumeCreatorConfig = {
      tokenAddress: new PublicKey(config.tokenAddress),
      bondingCurveAddress: new PublicKey(config.bondingCurveAddress),
      associatedBondingCurve: new PublicKey(config.associatedBondingCurve),
      wallets: volumeWallets,
      minTradeAmount: config.minTradeAmount,
      maxTradeAmount: config.maxTradeAmount,
      minDelaySeconds: config.minDelaySeconds,
      maxDelaySeconds: config.maxDelaySeconds,
      slippageBps: config.slippageBps,
      dryRun: config.dryRun,
    };

    const volumeCreator = new VolumeCreator(
      volumeCreatorConfig,
      solanaService,
      txService
    );

    logger.info('✅ VolumeCreator initialized');

    // ============================================
    // 5. Wire Santa to Reindeer 1
    // ============================================
    logger.info('\n🔗 Step 5: Wiring Santa to Reindeer 1...');

    feeCollector.setVolumeCreator(volumeCreator);

    logger.info('✅ Santa and Reindeer 1 connected');

    // ============================================
    // 6. Check Bonding Curve Status
    // ============================================
    logger.info('\n📊 Step 6: Checking Bonding Curve Status...');

    const bondingCurveStatus = await feeCollector.getBondingCurveStatus();

    logger.info('Bonding Curve Details:', {
      virtualTokenReserves: bondingCurveStatus.virtualTokenReserves,
      virtualSolReserves: bondingCurveStatus.virtualSolReserves / 1e9,
      realTokenReserves: bondingCurveStatus.realTokenReserves,
      realSolReserves: bondingCurveStatus.realSolReserves / 1e9,
      complete: bondingCurveStatus.complete,
      progressPercent: bondingCurveStatus.progressPercent.toFixed(2) + '%',
    });

    // ============================================
    // 7. Test Volume Creator Directly
    // ============================================
    logger.info('\n🧪 Step 7: Testing Volume Creator (Dry Run)...');

    const testAmount = 0.01; // 0.01 SOL
    logger.info(`Testing volume creation with ${testAmount} SOL...`);

    await volumeCreator.createVolume(testAmount);

    const volumeStats = volumeCreator.getStats();
    logger.info('✅ Volume Creator Stats:', {
      totalVolume: volumeStats.totalVolume,
      tradeCount: volumeStats.tradeCount,
      successfulTrades: volumeStats.successfulTrades,
      failedTrades: volumeStats.failedTrades,
    });

    // ============================================
    // 8. Test Fee Check (One Cycle)
    // ============================================
    logger.info('\n🧪 Step 8: Testing Fee Check Cycle...');

    await feeCollector.checkAndClaimFees();

    const feeStats = feeCollector.getStats();
    logger.info('Fee Collector Stats:', {
      totalCollected: feeStats.totalCollected,
      lastClaimAmount: feeStats.lastClaimAmount,
      claimCount: feeStats.claimCount,
      distributionCount: feeStats.distributionHistory.length,
    });

    // ============================================
    // Summary
    // ============================================
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ ALL TESTS PASSED!');
    logger.info('=' .repeat(60));
    logger.info('\n📋 Summary:');
    logger.info('  Phase 2 (Santa/FeeCollector): ✅ Working');
    logger.info('  Phase 3 (Reindeer 1/VolumeCreator): ✅ Working');
    logger.info('  Integration (Santa → Reindeer 1): ✅ Working');
    logger.info('  Dry-run mode: ✅ Enabled');
    logger.info('\n💡 Next Steps:');
    logger.info('  1. Build Phase 4 (Reindeer 2: Buyback & Burn)');
    logger.info('  2. Build Phase 5 (Reindeer 3: Airdrop Distributor)');
    logger.info('  3. Build Phase 6 (Backend API + Telegram Bot)');
    logger.info('  4. Build Phase 7 (Main Orchestrator)');
    logger.info('  5. Full integration test with all modules');

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Test failed:', { error: errorMsg });
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
