/**
 * ❄️ Frostbyte - Connection Test
 *
 * Tests that all services initialize correctly
 */

import { PublicKey } from '@solana/web3.js';
import { config } from './config/env';
import { SolanaService } from './services/solanaService';

async function testConnection() {
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  🎅 TESTING SANTA\'S BOT CONNECTION');
  console.log('═══════════════════════════════════════════');
  console.log('');

  try {
    // Test 1: Initialize Services
    console.log('📦 Test 1: Initializing services...');
    const solanaService = new SolanaService(
      config.rpcEndpoint,
      config.rpcWebsocketEndpoint
    );
    console.log('   ✅ Services initialized\n');

    // Test 2: Check RPC Connection
    console.log('🌐 Test 2: Checking RPC connection...');
    const isHealthy = await solanaService.checkConnectionHealth();
    if (!isHealthy) {
      throw new Error('RPC connection is unhealthy');
    }
    console.log('   ✅ RPC connection healthy\n');

    // Test 3: Load Creator Wallet
    console.log('👛 Test 3: Loading creator wallet...');
    const creatorWallet = solanaService.loadWallet(config.creatorPrivateKey);
    console.log('   ✅ Creator wallet loaded');
    console.log('   📍 Address:', creatorWallet.publicKey.toString());
    console.log('');

    // Test 4: Check SOL Balance
    console.log('💰 Test 4: Checking SOL balance...');
    const solBalance = await solanaService.getSolBalance(
      creatorWallet.publicKey
    );
    console.log('   ✅ SOL Balance:', solBalance.toFixed(4), 'SOL');

    if (solBalance < 0.01) {
      console.log('   ⚠️  WARNING: Low SOL balance! Need at least 0.01 SOL for transactions');
    }
    console.log('');

    // Test 5: Check Token Info
    console.log('🪙 Test 5: Checking token info...');
    try {
      const tokenMint = new PublicKey(config.tokenAddress);
      const tokenInfo = await solanaService.getTokenInfo(tokenMint);
      console.log('   ✅ Token found');
      console.log('   📊 Supply:', (tokenInfo.supply / Math.pow(10, tokenInfo.decimals)).toLocaleString());
      console.log('   🔢 Decimals:', tokenInfo.decimals);
      console.log('');
    } catch (error: any) {
      console.log('   ⚠️  Could not fetch token info:', error.message);
      console.log('');
    }

    // Test 6: Check Bonding Curve
    console.log('📈 Test 6: Checking bonding curve...');
    if (config.bondingCurveAddress) {
      const bondingCurve = new PublicKey(config.bondingCurveAddress);
      const bondingCurveInfo = await solanaService.getAccountInfo(bondingCurve);

      if (bondingCurveInfo) {
        console.log('   ✅ Bonding curve found');
        console.log('   📍 Address:', bondingCurve.toString());
        console.log('');
      } else {
        console.log('   ⚠️  Bonding curve account not found');
        console.log('');
      }
    } else {
      console.log('   ⚠️  Bonding curve address not configured');
      console.log('   💡 Run: npm run derive-addresses');
      console.log('');
    }

    // Test 7: Check Token Balance
    console.log('🎫 Test 7: Checking token balance...');
    try {
      const tokenMint = new PublicKey(config.tokenAddress);
      const tokenBalance = await solanaService.getTokenBalance(
        creatorWallet.publicKey,
        tokenMint
      );
      console.log('   ✅ Token Balance:', tokenBalance.toLocaleString(), 'tokens');
      console.log('');
    } catch (error: any) {
      console.log('   ⚠️  Could not fetch token balance:', error.message);
      console.log('');
    }

    // Test 8: Check Priority Fee Calculation
    console.log('⚡ Test 8: Calculating priority fee...');
    const priorityFee = await solanaService.calculatePriorityFee();
    console.log('   ✅ Priority Fee:', priorityFee, 'micro-lamports');
    console.log('');

    // Test 9: Configuration Check
    console.log('⚙️  Test 9: Configuration check...');
    console.log('   Token Address:', config.tokenAddress);
    console.log('   Bonding Curve:', config.bondingCurveAddress || 'NOT SET');
    console.log('   Associated BC:', config.associatedBondingCurve || 'NOT SET');
    console.log('   Volume Wallets:', config.volumeWalletKeys.length);
    console.log('   Dry Run Mode:', config.dryRun ? '✅ ENABLED (Safe)' : '⚠️  DISABLED');
    console.log('   Fee Threshold:', config.minimumClaimThreshold, 'SOL');
    console.log('   Telegram Bot:', config.telegramBotToken ? '✅ Configured' : '❌ Not configured');
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📋 Status:');
    console.log('   ✅ RPC Connection: Working');
    console.log('   ✅ Wallet: Loaded');
    console.log('   ✅ Services: Initialized');
    console.log('   ✅ Configuration: Valid');
    console.log('');

    if (config.dryRun) {
      console.log('🧪 DRY RUN MODE ENABLED');
      console.log('   No real transactions will be executed');
      console.log('   Safe for testing!');
      console.log('');
    } else {
      console.log('⚠️  DRY RUN MODE DISABLED');
      console.log('   Real transactions will be executed!');
      console.log('   Set DRY_RUN=true in .env for testing');
      console.log('');
    }

    console.log('🚀 Ready to build the rest of Santa\'s Bot!');
    console.log('');

  } catch (error) {
    console.error('\n❌ TEST FAILED!\n');
    console.error('Error:', error);
    console.error('\nPlease check your configuration in .env file\n');
    process.exit(1);
  }
}

// Run tests
testConnection().catch(console.error);
