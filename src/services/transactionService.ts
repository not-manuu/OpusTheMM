/**
 * ❄️ Frostbyte - Transaction Service
 *
 * Handles transaction building, sending, and confirmation
 */

import {
  Connection,
  Transaction,
  TransactionInstruction,
  Keypair,
  PublicKey,
  SendOptions,
  TransactionSignature,
  SimulatedTransactionResponse,
} from '@solana/web3.js';
import { SolanaService } from './solanaService';
import { logger } from '../utils/logger';

export class TransactionService {
  private connection: Connection;

  constructor(private solanaService: SolanaService) {
    this.connection = solanaService.getConnection();
    logger.info('✅ Transaction service initialized');
  }

  /**
   * Build a transaction from instructions
   */
  async buildTransaction(
    instructions: TransactionInstruction[],
    payer: PublicKey
  ): Promise<Transaction> {
    try {
      const transaction = new Transaction();

      // Add all instructions
      transaction.add(...instructions);

      // Set recent blockhash
      const blockhash = await this.solanaService.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      return transaction;
    } catch (error) {
      logger.error('Failed to build transaction', { error });
      throw error;
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Keypair[],
    options?: SendOptions
  ): Promise<TransactionSignature> {
    try {
      // Sign transaction
      transaction.sign(...signers);

      // Send options
      const sendOptions: SendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        ...options,
      };

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        sendOptions
      );

      logger.debug('Transaction sent', { signature });

      return signature;
    } catch (error: any) {
      logger.error('Failed to send transaction', {
        error: error?.message || error,
        logs: error?.logs,
      });
      throw error;
    }
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(
    signature: TransactionSignature
  ): Promise<boolean> {
    try {
      const latestBlockhash =
        await this.connection.getLatestBlockhash('confirmed');

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        logger.error('Transaction failed', {
          signature,
          error: confirmation.value.err,
        });
        return false;
      }

      logger.debug('Transaction confirmed', { signature });
      return true;
    } catch (error) {
      logger.error('Failed to confirm transaction', {
        signature,
        error,
      });
      return false;
    }
  }

  /**
   * Send and confirm a transaction (with retries)
   */
  async sendAndConfirm(
    transaction: Transaction,
    signers: Keypair[],
    maxRetries: number = 3
  ): Promise<TransactionSignature> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Transaction attempt ${attempt}/${maxRetries}`);

        // Send transaction
        const signature = await this.sendTransaction(transaction, signers);

        // Confirm transaction
        const confirmed = await this.confirmTransaction(signature);

        if (confirmed) {
          logger.info('✅ Transaction successful', {
            signature,
            attempt,
          });
          return signature;
        } else {
          throw new Error('Transaction not confirmed');
        }
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Transaction attempt ${attempt} failed`, {
          error: error?.message || error,
          attempt,
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          logger.debug(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Get fresh blockhash for retry
          const blockhash = await this.solanaService.getRecentBlockhash();
          transaction.recentBlockhash = blockhash;
        }
      }
    }

    throw new Error(
      `Transaction failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Simulate a transaction
   */
  async simulateTransaction(
    transaction: Transaction
  ): Promise<SimulatedTransactionResponse> {
    try {
      const simulation =
        await this.connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        logger.warn('Transaction simulation failed', {
          error: simulation.value.err,
          logs: simulation.value.logs,
        });
      } else {
        logger.debug('Transaction simulation successful', {
          unitsConsumed: simulation.value.unitsConsumed,
        });
      }

      return simulation.value;
    } catch (error) {
      logger.error('Failed to simulate transaction', { error });
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: TransactionSignature) {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      logger.error('Failed to get transaction', { signature, error });
      throw error;
    }
  }

  /**
   * Retry helper with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i === maxRetries - 1) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, i);
        logger.debug(`Retry attempt ${i + 1}/${maxRetries} in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
