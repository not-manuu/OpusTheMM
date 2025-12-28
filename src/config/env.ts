/**
 * ❄️ Frostbyte - Environment Configuration
 *
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

export interface Config {
  // RPC
  rpcEndpoint: string;
  rpcWebsocketEndpoint: string;

  // Token
  tokenAddress: string;
  bondingCurveAddress: string;
  associatedBondingCurve: string;

  // Wallets
  creatorPrivateKey: string;
  volumeWalletKeys: string[];
  burnWalletPrivateKey: string;
  treasuryWalletAddress: string;

  // Fee Collection (Santa)
  minimumClaimThreshold: number;
  feeCheckInterval: number;

  // Volume Creation (Reindeer 1)
  minTradeAmount: number;
  maxTradeAmount: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  slippageBps: number;

  // Buyback & Burn (Reindeer 2)
  maxBurnPerTx: number;

  // Airdrop (Reindeer 3)
  minHolderThreshold: number;
  minAirdropAmount: number;
  maxRecipientsPerRun: number;

  // API
  apiPort: number;
  apiKey: string;
  allowedOrigins: string;

  // Telegram (optional)
  telegramBotToken?: string;
  telegramAdminChatIds: number[];

  // Operational
  dryRun: boolean;
  logLevel: string;
  nodeEnv: string;
}

function validateEnv(): Config {
  const required = [
    'RPC_ENDPOINT',
    'CREATOR_PRIVATE_KEY',
    'TOKEN_ADDRESS',
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please copy .env.example to .env and fill in the values.`
    );
  }

  // Parse volume wallet keys
  const volumeKeys = process.env.VOLUME_WALLET_KEYS
    ? process.env.VOLUME_WALLET_KEYS.split(',').map(k => k.trim())
    : [process.env.CREATOR_PRIVATE_KEY!]; // Default to creator wallet

  // Parse Telegram admin chat IDs
  const telegramChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS
    ? process.env.TELEGRAM_ADMIN_CHAT_IDS.split(',').map(id => parseInt(id.trim()))
    : [];

  const config: Config = {
    // RPC
    rpcEndpoint: process.env.RPC_ENDPOINT!,
    rpcWebsocketEndpoint:
      process.env.RPC_WEBSOCKET_ENDPOINT || process.env.RPC_ENDPOINT!,

    // Token
    tokenAddress: process.env.TOKEN_ADDRESS!,
    bondingCurveAddress: process.env.BONDING_CURVE_ADDRESS || '',
    associatedBondingCurve: process.env.ASSOCIATED_BONDING_CURVE || '',

    // Wallets
    creatorPrivateKey: process.env.CREATOR_PRIVATE_KEY!,
    volumeWalletKeys: volumeKeys,
    burnWalletPrivateKey:
      process.env.BURN_WALLET_PRIVATE_KEY || process.env.CREATOR_PRIVATE_KEY!,
    treasuryWalletAddress:
      process.env.TREASURY_WALLET_ADDRESS || '',

    // Fee Collection
    minimumClaimThreshold: parseFloat(
      process.env.MINIMUM_CLAIM_THRESHOLD || '0.01'
    ),
    feeCheckInterval: parseInt(process.env.FEE_CHECK_INTERVAL || '30000'),

    // Volume Creation
    minTradeAmount: parseFloat(process.env.MIN_TRADE_AMOUNT || '0.001'),
    maxTradeAmount: parseFloat(process.env.MAX_TRADE_AMOUNT || '0.05'),
    minDelaySeconds: parseInt(process.env.MIN_DELAY_SECONDS || '5'),
    maxDelaySeconds: parseInt(process.env.MAX_DELAY_SECONDS || '30'),
    slippageBps: parseInt(process.env.SLIPPAGE_BPS || '300'),

    // Buyback & Burn
    maxBurnPerTx: parseInt(process.env.MAX_BURN_PER_TX || '1000000000'),

    // Airdrop
    minHolderThreshold: parseInt(process.env.MIN_HOLDER_THRESHOLD || '1000000'),
    minAirdropAmount: parseFloat(process.env.MIN_AIRDROP_AMOUNT || '0.001'),
    maxRecipientsPerRun: parseInt(process.env.MAX_RECIPIENTS_PER_RUN || '100'),

    // API
    apiPort: parseInt(process.env.API_PORT || '3000'),
    apiKey: process.env.API_KEY || 'change_this_api_key',
    allowedOrigins: process.env.ALLOWED_ORIGINS || '*',

    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramAdminChatIds: telegramChatIds,

    // Operational
    dryRun: process.env.DRY_RUN === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  // Validate token address
  try {
    new PublicKey(config.tokenAddress);
  } catch (error) {
    throw new Error(`Invalid TOKEN_ADDRESS: ${config.tokenAddress}`);
  }

  // Validate bonding curve addresses if provided
  if (config.bondingCurveAddress) {
    try {
      new PublicKey(config.bondingCurveAddress);
    } catch (error) {
      throw new Error(
        `Invalid BONDING_CURVE_ADDRESS: ${config.bondingCurveAddress}`
      );
    }
  }

  if (config.associatedBondingCurve) {
    try {
      new PublicKey(config.associatedBondingCurve);
    } catch (error) {
      throw new Error(
        `Invalid ASSOCIATED_BONDING_CURVE: ${config.associatedBondingCurve}`
      );
    }
  }

  // Warn about missing bonding curve addresses
  if (!config.bondingCurveAddress || !config.associatedBondingCurve) {
    logger.warn(
      '⚠️  Bonding curve addresses not set. Run: npm run derive-addresses'
    );
  }

  return config;
}

// Export validated config
export const config = validateEnv();

// Log configuration (sanitized)
logger.info('Configuration loaded', {
  tokenAddress: config.tokenAddress,
  dryRun: config.dryRun,
  volumeWallets: config.volumeWalletKeys.length,
  telegramEnabled: !!config.telegramBotToken,
  environment: config.nodeEnv,
});
