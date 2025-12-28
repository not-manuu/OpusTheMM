/**
 * ❄️ Frostbyte - Blockchain Constants
 *
 * Solana program IDs and addresses used throughout the bot
 */

import { PublicKey } from '@solana/web3.js';

// ============================================
// PUMP.FUN PROGRAM
// ============================================
export const PUMP_FUN_PROGRAM = new PublicKey(
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
);

export const PUMP_FUN_GLOBAL = new PublicKey(
  '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'
);

export const PUMP_FUN_FEE_RECIPIENT = new PublicKey(
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'
);

export const PUMP_FUN_EVENT_AUTHORITY = new PublicKey(
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'
);

// ============================================
// SOLANA SYSTEM PROGRAMS
// ============================================
export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

export const SYSTEM_PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111'
);

export const SYSVAR_RENT_PUBKEY = new PublicKey(
  'SysvarRent111111111111111111111111111111111'
);

// ============================================
// PUMP.FUN SEEDS
// ============================================
export const BONDING_CURVE_SEED = 'bonding-curve';

// ============================================
// BURN ADDRESS
// ============================================
export const BURN_ADDRESS = new PublicKey(
  '1nc1nerator11111111111111111111111111111111'
);

// ============================================
// LAMPORTS
// ============================================
export const LAMPORTS_PER_SOL = 1_000_000_000;

// ============================================
// DISTRIBUTION PERCENTAGES
// ============================================
// ❄️ Frostbyte distribution percentages
export const DISTRIBUTION = {
  REINDEER_1_VOLUME: 25,    // Volume Creation
  REINDEER_2_BUYBACK: 25,   // Buyback & Burn
  REINDEER_3_AIRDROP: 25,   // Holder Airdrops
  REINDEER_4_TREASURY: 25,  // Treasury/Operations
} as const;

// Validate distribution totals 100%
const totalDistribution = Object.values(DISTRIBUTION).reduce((a, b) => a + b, 0);
if (totalDistribution !== 100) {
  throw new Error(`Distribution must total 100%, got ${totalDistribution}%`);
}
