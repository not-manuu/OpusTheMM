/**
 * 🎅 Santa's Tokenomics Bot - TypeScript Type Definitions
 *
 * Shared types used throughout the bot
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// ============================================
// FEE COLLECTOR TYPES (Santa)
// ============================================

export interface FeeCollectorConfig {
  tokenAddress: PublicKey;
  bondingCurveAddress: PublicKey;
  associatedBondingCurve: PublicKey;
  creatorWallet: Keypair;
  minimumClaimThreshold: number;
  checkInterval: number;
  distributionPercentages: DistributionPercentages;
  treasuryWalletAddress: PublicKey;
  dryRun: boolean;
}

export interface DistributionPercentages {
  volume: number;
  buyback: number;
  airdrop: number;
  treasury: number;
}

export interface FeeStats {
  totalCollected: number;
  lastClaimAmount: number;
  lastClaimTime: Date | null;
  claimCount: number;
  distributionHistory: DistributionRecord[];
}

export interface DistributionRecord {
  timestamp: Date;
  totalAmount: number;
  volumeShare: number;
  buybackShare: number;
  airdropShare: number;
  treasuryShare: number;
  success: boolean;
  errors: string[];
  signature?: string;
}

// ============================================
// BONDING CURVE TYPES
// ============================================

export interface BondingCurveData {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
}

export interface BondingCurveStatus {
  virtualTokenReserves: number;
  virtualSolReserves: number;
  realTokenReserves: number;
  realSolReserves: number;
  tokenTotalSupply: number;
  complete: boolean;
  progressPercent: number;
}

// ============================================
// VOLUME CREATOR TYPES (Reindeer 1)
// ============================================

export interface VolumeCreatorConfig {
  tokenAddress: PublicKey;
  bondingCurveAddress: PublicKey;
  associatedBondingCurve: PublicKey;
  wallets: Keypair[];
  minTradeAmount: number;
  maxTradeAmount: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  slippageBps: number;
  dryRun: boolean;
}

export interface VolumeStats {
  totalVolume: number;
  tradeCount: number;
  successfulTrades: number;
  failedTrades: number;
  lastTradeTime: Date | null;
  tradeHistory: TradeRecord[];
}

export interface TradeRecord {
  timestamp: Date;
  wallet: string;
  amountSol: number;
  tokensReceived: number;
  signature: string;
  success: boolean;
  error?: string;
}

// ============================================
// BUYBACK & BURN TYPES (Reindeer 2)
// ============================================

export interface BuybackBurnConfig {
  tokenAddress: PublicKey;
  bondingCurveAddress: PublicKey;
  associatedBondingCurve: PublicKey;
  burnWallet: Keypair;
  slippageBps: number;
  maxBurnPerTx: number;
  dryRun: boolean;
}

export interface BurnStats {
  totalBurned: number;
  totalSolSpent: number;
  burnCount: number;
  lastBurnTime: Date | null;
  burnHistory: BurnRecord[];
}

export interface BurnRecord {
  timestamp: Date;
  tokensBurned: number;
  solSpent: number;
  signature: string;
  burnSignature: string;
  success: boolean;
  error?: string;
}

// ============================================
// AIRDROP TYPES (Reindeer 3)
// ============================================

export interface AirdropConfig {
  tokenAddress: PublicKey;
  payerWallet: Keypair;
  minHolderThreshold: number;
  minAirdropAmount: number;
  maxRecipientsPerRun: number;
  dryRun: boolean;
}

export interface AirdropStats {
  totalDistributed: number;
  distributionCount: number;
  uniqueRecipients: Set<string>;
  lastDistributionTime: Date | null;
  distributionHistory: AirdropRecord[];
}

export interface AirdropRecord {
  timestamp: Date;
  totalAmount: number;
  recipientCount: number;
  recipients: AirdropRecipient[];
  signature: string;
  success: boolean;
  error?: string;
}

export interface AirdropRecipient {
  wallet: string;
  tokenBalance: number;
  solReceived: number;
}

export interface TokenHolder {
  wallet: PublicKey;
  balance: number;
}

// ============================================
// TREASURY TYPES (Reindeer 4)
// ============================================

export interface TreasuryStats {
  totalReceived: number;
  transferCount: number;
  lastTransferTime: Date | null;
  transferHistory: TreasuryRecord[];
}

export interface TreasuryRecord {
  timestamp: Date;
  amount: number;
  signature: string;
  success: boolean;
  error?: string;
}

// ============================================
// MODULE INTERFACES
// ============================================

export interface IVolumeCreator {
  createVolume(amountSol: number): Promise<void>;
  getStats(): VolumeStats;
}

export interface IBuybackBurner {
  buybackAndBurn(amountSol: number): Promise<void>;
  getStats(): BurnStats;
}

export interface IAirdropDistributor {
  distribute(amountSol: number): Promise<void>;
  getStats(): AirdropStats;
}

// ============================================
// API TYPES
// ============================================

export interface ApiStats {
  fees: FeeStats;
  volume: VolumeStats;
  burns: BurnStats;
  airdrops: AirdropStats;
  treasury: TreasuryStats;
  uptime: number;
  lastUpdate: Date;
}

export interface WebSocketEvent {
  type: 'fee_claimed' | 'volume_created' | 'burn_complete' | 'airdrop_complete' | 'treasury_transfer' | 'error';
  timestamp: Date;
  data: Record<string, unknown>;
}

// ============================================
// ERROR TYPES
// ============================================

export class SolanaServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'SolanaServiceError';
  }
}

export class TransactionError extends SolanaServiceError {
  constructor(
    message: string,
    public signature?: string
  ) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
  }
}

export class NetworkError extends SolanaServiceError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class BondingCurveError extends SolanaServiceError {
  constructor(message: string) {
    super(message, 'BONDING_CURVE_ERROR');
    this.name = 'BondingCurveError';
  }
}
