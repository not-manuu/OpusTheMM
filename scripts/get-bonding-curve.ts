/**
 * Helper script to derive bonding curve addresses from pump.fun token
 *
 * Usage: ts-node scripts/get-bonding-curve.ts
 */

import { PublicKey } from '@solana/web3.js';

// Your token mint address
const TOKEN_MINT = 'ACA4EQhrUfCyzYuV21jQX6gpWU6dqbechE8HhKXbpump';

// Pump.fun program ID
const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// Token program
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Associated Token Program
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

async function deriveBondingCurveAddresses() {
  console.log('🎅 Deriving Bonding Curve Addresses for Santa\'s Bot\n');
  console.log('Token Mint:', TOKEN_MINT);
  console.log('');

  const mint = new PublicKey(TOKEN_MINT);

  try {
    // Derive Bonding Curve PDA
    const [bondingCurve, bondingCurveBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('bonding-curve'),
        mint.toBuffer(),
      ],
      PUMP_FUN_PROGRAM
    );

    console.log('✅ Bonding Curve Address:');
    console.log('   ', bondingCurve.toString());
    console.log('   Bump:', bondingCurveBump);
    console.log('');

    // Derive Associated Bonding Curve (ATA for bonding curve)
    const [associatedBondingCurve, _] = await PublicKey.findProgramAddress(
      [
        bondingCurve.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('✅ Associated Bonding Curve:');
    console.log('   ', associatedBondingCurve.toString());
    console.log('');

    console.log('📋 Add these to your .env file:');
    console.log('─'.repeat(60));
    console.log(`TOKEN_ADDRESS=${TOKEN_MINT}`);
    console.log(`BONDING_CURVE_ADDRESS=${bondingCurve.toString()}`);
    console.log(`ASSOCIATED_BONDING_CURVE=${associatedBondingCurve.toString()}`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error deriving addresses:', error);
  }
}

// Run if called directly
if (require.main === module) {
  deriveBondingCurveAddresses().catch(console.error);
}

export { deriveBondingCurveAddresses };
