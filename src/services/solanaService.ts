/**
 * 🎅 Santa's Tokenomics Bot - Solana Service
 *
 * Handles Solana RPC connection, wallet management, and blockchain queries
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Commitment,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import bs58 from 'bs58';
import { logger } from '../utils/logger';

export class SolanaService {
  private connection: Connection;
  private readonly commitment: Commitment = 'confirmed';

  constructor(rpcEndpoint: string, wsEndpoint: string) {
    // Connection handles both HTTP and WebSocket internally
    this.connection = new Connection(rpcEndpoint, {
      commitment: this.commitment,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: wsEndpoint, // WebSocket endpoint for subscriptions
    });

    logger.info('✅ Solana service initialized', {
      rpcEndpoint: rpcEndpoint.substring(0, 50) + '...',
      wsEndpoint: wsEndpoint.substring(0, 50) + '...',
      commitment: this.commitment,
    });
  }

  /**
   * Get the RPC connection (handles both HTTP and WebSocket)
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check if RPC connection is healthy
   */
  async checkConnectionHealth(): Promise<boolean> {
    try {
      const slot = await this.connection.getSlot();
      logger.debug('Connection healthy', { slot });
      return true;
    } catch (error) {
      logger.error('Connection health check failed', { error });
      return false;
    }
  }

  /**
   * Load a wallet from base58 encoded private key
   */
  loadWallet(privateKeyBase58: string): Keypair {
    try {
      const secretKey = bs58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);

      logger.debug('Wallet loaded', {
        publicKey: keypair.publicKey.toString(),
      });

      return keypair;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load wallet', { error });
      throw new Error(`Invalid private key: ${errorMsg}`);
    }
  }

  /**
   * Load multiple wallets from an array of private keys
   */
  loadMultipleWallets(privateKeys: string[]): Keypair[] {
    const wallets = privateKeys.map((key, index) => {
      try {
        return this.loadWallet(key);
      } catch (error) {
        logger.error(`Failed to load wallet ${index + 1}`, { error });
        throw error;
      }
    });

    logger.info(`Loaded ${wallets.length} wallets`);
    return wallets;
  }

  /**
   * Get SOL balance of a wallet
   */
  async getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Failed to get SOL balance', {
        publicKey: publicKey.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Get token balance of a wallet
   */
  async getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(mint, owner);

      const accountInfo = await this.connection.getTokenAccountBalance(
        tokenAccount
      );

      return Number(accountInfo.value.amount);
    } catch (error) {
      // If account doesn't exist, balance is 0
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('could not find account')) {
        return 0;
      }

      logger.error('Failed to get token balance', {
        owner: owner.toString(),
        mint: mint.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Find associated token account address
   */
  async findAssociatedTokenAccount(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(mint, owner);
  }

  /**
   * Get recent blockhash
   */
  async getRecentBlockhash(): Promise<string> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash(
        this.commitment
      );
      return blockhash;
    } catch (error) {
      logger.error('Failed to get recent blockhash', { error });
      throw error;
    }
  }

  /**
   * Calculate optimal priority fee based on recent fees
   */
  async calculatePriorityFee(): Promise<number> {
    try {
      const recentFees =
        await this.connection.getRecentPrioritizationFees();

      if (recentFees.length === 0) {
        return 1000; // Default 1000 micro-lamports
      }

      // Calculate 75th percentile for competitive fee
      const fees = recentFees
        .map((f) => f.prioritizationFee)
        .sort((a, b) => a - b);

      const percentile75Index = Math.floor(fees.length * 0.75);
      const percentile75 = fees[percentile75Index];

      // Ensure between 1000 and 100000 micro-lamports
      const optimalFee = Math.max(1000, Math.min(100000, percentile75));

      logger.debug('Priority fee calculated', {
        percentile75,
        optimalFee,
      });

      return optimalFee;
    } catch (error) {
      logger.warn('Failed to calculate priority fee, using default', {
        error,
      });
      return 1000; // Default fallback
    }
  }

  /**
   * Get token mint information
   */
  async getTokenInfo(mint: PublicKey) {
    try {
      const mintInfo = await getMint(this.connection, mint);
      return {
        supply: Number(mintInfo.supply),
        decimals: mintInfo.decimals,
        mintAuthority: mintInfo.mintAuthority?.toString(),
        freezeAuthority: mintInfo.freezeAuthority?.toString(),
      };
    } catch (error) {
      logger.error('Failed to get token info', {
        mint: mint.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(address: PublicKey) {
    try {
      return await this.connection.getAccountInfo(address);
    } catch (error) {
      logger.error('Failed to get account info', {
        address: address.toString(),
        error,
      });
      throw error;
    }
  }
}
