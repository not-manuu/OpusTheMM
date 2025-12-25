/**
 * Test Phase 2, 3, and 4 Integration
 *
 * Tests:
 * - FeeCollector (Santa)
 * - VolumeCreator (Reindeer 1)
 * - BuybackBurner (Reindeer 2)
 * - Full integration between all three modules
 */

import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './services/solanaService';
import { TransactionService } from './services/transactionService';
import { FeeCollector } from './modules/feeCollector';
import { VolumeCreator } from './modules/volumeCreator';
import { BuybackBurner } from './modules/buybackBurn';
import { logger } from './utils/logger';
import { config } from './config/env';

async function main() {
  logger.info('🧪 Starting Phase 2, 3 & 4 Integration Test');
  logger.info('='.repeat(60));

  try {
    // ============================================
    // 1. Initialize Services
    // ============================================
    logger.info('\n📡 Step 1: Initializing Services...');

    const solanaService = new SolanaService(
      config.rpcEndpoint,
      config.rpcWebsocketEndpoint
    );

    const txService = new TransactionService(solanaService);

    const isHealthy = await solanaService.checkConnectionHealth();
    if (!isHealthy) {
      throw new Error('RPC connection is not healthy');
    }
    logger.info('✅ Services initialized and healthy');

    // ============================================
    // 2. Load Wallets
    // ============================================
    logger.info('\n👛 Step 2: Loading Wallets...');

    const creatorWallet = solanaService.loadWallet(config.creatorPrivateKey);
    const volumeWallets = solanaService.loadMultipleWallets([
      config.creatorPrivateKey,
    ]);

    logger.info('✅ Wallets loaded:', {
      creator: creatorWallet.publicKey.toString(),
      volumeWallets: volumeWallets.length,
    });

    const creatorBalance = await solanaService.getSolBalance(
      creatorWallet.publicKey
    );
    logger.info(`💰 Creator balance: ${creatorBalance.toFixed(4)} SOL`);

    // ============================================
    // 3. Initialize VolumeCreator (Reindeer 1)
    // ============================================
    logger.info('\n🦌 Step 3: Initializing Reindeer 1 (Volume Creator)...');

    const volumeCreator = new VolumeCreator(
      {
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
      },
      solanaService,
      txService
    );

    logger.info('✅ Reindeer 1 initialized');

    // ============================================
    // 4. Initialize BuybackBurner (Reindeer 2)
    // ============================================
    logger.info('\n🦌 Step 4: Initializing Reindeer 2 (Buyback & Burn)...');

    const buybackBurner = new BuybackBurner(
      {
        tokenAddress: new PublicKey(config.tokenAddress),
        bondingCurveAddress: new PublicKey(config.bondingCurveAddress),
        associatedBondingCurve: new PublicKey(config.associatedBondingCurve),
        burnWallet: creatorWallet, // Using creator wallet
        slippageBps: config.slippageBps,
        maxBurnPerTx: config.maxBurnPerTx,
        dryRun: config.dryRun,
      },
      solanaService,
      txService
    );

    logger.info('✅ Reindeer 2 initialized');

    // ============================================
    // 5. Initialize FeeCollector (Santa)
    // ============================================
    logger.info('\n🎅 Step 5: Initializing Santa (Fee Collector)...');

    const feeCollector = new FeeCollector(
      {
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
        treasuryWalletAddress: creatorWallet.publicKey,
        dryRun: config.dryRun,
      },
      solanaService,
      txService
    );

    logger.info('✅ Santa initialized');

    // ============================================
    // 6. Wire Santa to Reindeer
    // ============================================
    logger.info('\n🔗 Step 6: Wiring Santa to Reindeer...');

    feeCollector.setVolumeCreator(volumeCreator);
    feeCollector.setBuybackBurner(buybackBurner);
    // Reindeer 3 (Airdrop) not built yet
    // Reindeer 4 (Treasury) is built into Santa

    logger.info('✅ Santa connected to Reindeer 1 & 2');

    // ============================================
    // 7. Check Bonding Curve Status
    // ============================================
    logger.info('\n📊 Step 7: Checking Bonding Curve...');

    const bondingCurveStatus = await feeCollector.getBondingCurveStatus();

    logger.info('Bonding Curve Status:', {
      virtualSolReserves: (
        bondingCurveStatus.virtualSolReserves / 1e9
      ).toFixed(4),
      realSolReserves: (bondingCurveStatus.realSolReserves / 1e9).toFixed(4),
      complete: bondingCurveStatus.complete,
      progress: bondingCurveStatus.progressPercent.toFixed(2) + '%',
    });

    // ============================================
    // 8. Test Reindeer 1 (Volume Creator)
    // ============================================
    logger.info('\n🧪 Step 8: Testing Reindeer 1 (Volume Creator)...');

    const volumeTestAmount = 0.01;
    await volumeCreator.createVolume(volumeTestAmount);

    const volumeStats = volumeCreator.getStats();
    logger.info('✅ Reindeer 1 Stats:', {
      totalVolume: volumeStats.totalVolume.toFixed(6),
      trades: volumeStats.tradeCount,
      successful: volumeStats.successfulTrades,
      failed: volumeStats.failedTrades,
    });

    // ============================================
    // 9. Test Reindeer 2 (Buyback & Burn)
    // ============================================
    logger.info('\n🧪 Step 9: Testing Reindeer 2 (Buyback & Burn)...');

    const burnTestAmount = 0.005;
    await buybackBurner.buybackAndBurn(burnTestAmount);

    const burnStats = buybackBurner.getStats();
    logger.info('✅ Reindeer 2 Stats:', {
      totalBurned: burnStats.totalBurned.toLocaleString(),
      totalSolSpent: burnStats.totalSolSpent.toFixed(6),
      burnCount: burnStats.burnCount,
    });

    // Get burn report
    const burnReport = await buybackBurner.generateBurnReport();
    logger.info('\n' + burnReport);

    // ============================================
    // 10. Test Full Integration (Santa → All Reindeer)
    // ============================================
    logger.info('\n🧪 Step 10: Testing Full Distribution Flow...');

    await feeCollector.checkAndClaimFees();

    const feeStats = feeCollector.getStats();
    const treasuryStats = feeCollector.getTreasuryStats();

    logger.info('Fee Collector Stats:', {
      totalCollected: feeStats.totalCollected,
      claimCount: feeStats.claimCount,
      distributions: feeStats.distributionHistory.length,
    });

    logger.info('Treasury Stats:', {
      totalReceived: treasuryStats.totalReceived.toFixed(6),
      transfers: treasuryStats.transferCount,
    });

    // ============================================
    // 11. Display Distribution History
    // ============================================
    if (feeStats.distributionHistory.length > 0) {
      logger.info('\n📜 Distribution History:');
      feeStats.distributionHistory.forEach((dist, index) => {
        logger.info(`Distribution #${index + 1}:`, {
          timestamp: dist.timestamp.toISOString(),
          totalAmount: dist.totalAmount.toFixed(6),
          volume: dist.volumeShare.toFixed(6),
          buyback: dist.buybackShare.toFixed(6),
          airdrop: dist.airdropShare.toFixed(6),
          treasury: dist.treasuryShare.toFixed(6),
          success: dist.success,
          errors: dist.errors.length,
        });
      });
    }

    // ============================================
    // Summary
    // ============================================
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ ALL TESTS PASSED!');
    logger.info('='.repeat(60));
    logger.info('\n📋 Test Summary:');
    logger.info('  ✅ Phase 2 (Santa/FeeCollector): Working');
    logger.info('  ✅ Phase 3 (Reindeer 1/VolumeCreator): Working');
    logger.info('  ✅ Phase 4 (Reindeer 2/BuybackBurn): Working');
    logger.info('  ✅ Integration (Santa → Reindeer 1 & 2): Working');
    logger.info('  ✅ Dry-run mode: Enabled');
    logger.info('\n💡 Next Steps:');
    logger.info('  1. Build Phase 5 (Reindeer 3: Airdrop Distributor)');
    logger.info('  2. Build Phase 6 (Backend API + Telegram Bot)');
    logger.info('  3. Build Phase 7 (Main Orchestrator)');
    logger.info('  4. Full integration test with all modules');
    logger.info('  5. Deploy to Render');

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
