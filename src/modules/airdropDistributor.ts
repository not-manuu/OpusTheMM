/**
 * 🦌 Reindeer 3: Airdrop Distributor
 *
 * Distributes SOL to token holders proportionally based on their holdings
 * Creates holder incentives and rewards loyal community members
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { logger } from '../utils/logger';
import { SolanaService } from '../services/solanaService';
import { TransactionService } from '../services/transactionService';
import {
  AirdropConfig,
  IAirdropDistributor,
  AirdropStats,
  AirdropRecord,
  AirdropRecipient,
  TokenHolder,
} from '../types';

interface HolderDistribution {
  wallet: PublicKey;
  balance: number;
  percentage: number;
  solAmount: number;
}

export class AirdropDistributor implements IAirdropDistributor {
  private config: AirdropConfig;
  private solanaService: SolanaService;
  private txService: TransactionService;
  private stats: AirdropStats;
  private excludeAddresses: Set<string>;

  constructor(
    config: AirdropConfig,
    solanaService: SolanaService,
    txService: TransactionService,
    excludeAddresses: string[] = []
  ) {
    this.config = config;
    this.solanaService = solanaService;
    this.txService = txService;
    this.excludeAddresses = new Set(excludeAddresses);
    this.stats = {
      totalDistributed: 0,
      distributionCount: 0,
      uniqueRecipients: new Set(),
      lastDistributionTime: null,
      distributionHistory: [],
    };

    this.validateConfig();

    logger.info('🦌 Reindeer 3 (Airdrop Distributor) initialized', {
      tokenAddress: config.tokenAddress.toString(),
      minHolderThreshold: config.minHolderThreshold,
      minAirdropAmount: config.minAirdropAmount,
      maxRecipientsPerRun: config.maxRecipientsPerRun,
      excludeAddresses: excludeAddresses.length,
      dryRun: config.dryRun,
    });
  }

  private validateConfig(): void {
    if (this.config.minHolderThreshold <= 0) {
      throw new Error('Minimum holder threshold must be greater than 0');
    }

    if (this.config.minAirdropAmount <= 0) {
      throw new Error('Minimum airdrop amount must be greater than 0');
    }

    if (this.config.minAirdropAmount > 1) {
      logger.warn('Minimum airdrop amount is quite high (>1 SOL), may exclude many holders');
    }

    if (this.config.maxRecipientsPerRun <= 0) {
      throw new Error('Max recipients per run must be greater than 0');
    }

    if (this.config.maxRecipientsPerRun > 500) {
      logger.warn('Max recipients per run is very high (>500), may hit transaction limits');
    }
  }

  /**
   * Execute airdrop distribution
   * Called by Santa with allocated SOL amount
   */
  async distribute(amountSol: number): Promise<void> {
    logger.info('🎁 Reindeer 3 starting airdrop distribution', {
      allocatedSol: amountSol,
      dryRun: this.config.dryRun,
    });

    const record: AirdropRecord = {
      timestamp: new Date(),
      totalAmount: amountSol,
      recipientCount: 0,
      recipients: [],
      signature: '',
      success: false,
    };

    try {
      // Step 1: Get qualified holders
      const holders = await this.getQualifiedHolders();

      if (holders.length === 0) {
        logger.warn('No qualified holders found for airdrop');
        record.success = true;
        this.stats.distributionHistory.push(record);
        return;
      }

      logger.info(`Found ${holders.length} qualified holders`);

      // Step 2: Calculate distribution
      const distribution = this.calculateDistribution(holders, amountSol);

      if (distribution.length === 0) {
        logger.warn('No holders qualify after minimum airdrop filter');
        record.success = true;
        this.stats.distributionHistory.push(record);
        return;
      }

      record.recipientCount = distribution.length;
      record.recipients = distribution.map((d) => ({
        wallet: d.wallet.toString(),
        tokenBalance: d.balance,
        solReceived: d.solAmount,
      }));

      if (this.config.dryRun) {
        logger.info('🔵 DRY RUN: Would execute airdrop', {
          recipients: distribution.length,
          totalSol: amountSol,
          topRecipients: distribution.slice(0, 5).map((d) => ({
            wallet: d.wallet.toString().slice(0, 8) + '...',
            percentage: d.percentage.toFixed(2) + '%',
            solAmount: d.solAmount.toFixed(6),
          })),
        });

        record.signature = 'DRY_RUN_AIRDROP_SIGNATURE';
        record.success = true;
        this.updateStats(record);
        return;
      }

      // Step 3: Verify payer has enough SOL
      const payerBalance = await this.solanaService.getSolBalance(
        this.config.payerWallet.publicKey
      );
      const requiredSol = amountSol + 0.01; // Buffer for fees

      if (payerBalance < requiredSol) {
        throw new Error(
          `Insufficient SOL balance: ${payerBalance.toFixed(4)} SOL, need ${requiredSol.toFixed(4)} SOL`
        );
      }

      // Step 4: Execute batch transfers
      const signatures = await this.executeBatchTransfers(distribution);

      record.signature = signatures[0] || '';
      record.success = true;
      this.updateStats(record);

      logger.info('✅ Airdrop distribution complete', {
        recipients: distribution.length,
        totalSol: amountSol,
        signatures: signatures.length,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      record.error = errorMsg;
      this.stats.distributionHistory.push(record);

      logger.error('❌ Airdrop distribution failed', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Get all token holders meeting minimum threshold
   */
  private async getQualifiedHolders(): Promise<TokenHolder[]> {
    logger.info('📊 Fetching token holders...');

    const allHolders = await this.getAllTokenHolders();
    const filtered = this.filterHolders(allHolders);

    logger.info(`Qualified holders: ${filtered.length} (after filtering)`);

    return filtered;
  }

  /**
   * Query all token accounts for this mint
   */
  private async getAllTokenHolders(): Promise<TokenHolder[]> {
    const connection = this.solanaService.getConnection();
    const tokenMint = this.config.tokenAddress;

    logger.debug('Querying token accounts for mint', {
      mint: tokenMint.toString(),
    });

    const tokenAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Token account size
        },
        {
          memcmp: {
            offset: 0, // Mint address offset in token account
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    });

    logger.info(`Found ${tokenAccounts.length} token accounts`);

    const holderMap = new Map<string, number>();

    for (const { account } of tokenAccounts) {
      const data = AccountLayout.decode(account.data);
      const owner = new PublicKey(data.owner).toString();
      const balance = Number(data.amount);

      if (balance > 0) {
        const currentBalance = holderMap.get(owner) || 0;
        holderMap.set(owner, currentBalance + balance);
      }
    }

    const holders: TokenHolder[] = [];
    for (const [wallet, balance] of holderMap.entries()) {
      holders.push({
        wallet: new PublicKey(wallet),
        balance,
      });
    }

    logger.info(`Total unique holders with balance: ${holders.length}`);

    return holders;
  }

  /**
   * Filter holders by minimum threshold and exclude addresses
   */
  private filterHolders(holders: TokenHolder[]): TokenHolder[] {
    const filtered: TokenHolder[] = [];
    let excludedCount = 0;
    let belowThresholdCount = 0;

    for (const holder of holders) {
      const walletStr = holder.wallet.toString();

      // Skip excluded addresses
      if (this.excludeAddresses.has(walletStr)) {
        logger.debug(`Excluding address: ${walletStr.slice(0, 8)}...`);
        excludedCount++;
        continue;
      }

      // Skip if below threshold
      if (holder.balance < this.config.minHolderThreshold) {
        belowThresholdCount++;
        continue;
      }

      filtered.push(holder);
    }

    logger.info('Holder filtering results', {
      total: holders.length,
      qualified: filtered.length,
      excluded: excludedCount,
      belowThreshold: belowThresholdCount,
    });

    return filtered;
  }

  /**
   * Calculate proportional SOL distribution
   */
  private calculateDistribution(
    holders: TokenHolder[],
    totalSol: number
  ): HolderDistribution[] {
    logger.info('💰 Calculating distribution', {
      holders: holders.length,
      totalSol,
    });

    // Calculate total tokens held by all qualified holders
    let totalTokens = 0;
    for (const holder of holders) {
      totalTokens += holder.balance;
    }

    if (totalTokens === 0) {
      logger.warn('Total tokens held is 0, cannot distribute');
      return [];
    }

    logger.debug('Distribution basis', {
      totalTokens,
      totalSol,
      minAirdrop: this.config.minAirdropAmount,
    });

    const distribution: HolderDistribution[] = [];
    let dustFilteredCount = 0;

    for (const holder of holders) {
      const percentage = (holder.balance / totalTokens) * 100;
      const solAmount = (holder.balance / totalTokens) * totalSol;

      // Skip if below minimum airdrop amount (avoid dust)
      if (solAmount < this.config.minAirdropAmount) {
        logger.debug(
          `Skipping ${holder.wallet.toString().slice(0, 8)}...: amount too small (${solAmount.toFixed(6)} SOL)`
        );
        dustFilteredCount++;
        continue;
      }

      distribution.push({
        wallet: holder.wallet,
        balance: holder.balance,
        percentage,
        solAmount,
      });
    }

    // Sort by sol amount (largest first)
    distribution.sort((a, b) => b.solAmount - a.solAmount);

    // Calculate actual distribution amount (may be less than totalSol due to dust filtering)
    const actualDistributionAmount = distribution.reduce(
      (sum, d) => sum + d.solAmount,
      0
    );

    logger.info('Distribution calculation complete', {
      totalHolders: holders.length,
      qualifiedRecipients: distribution.length,
      dustFiltered: dustFilteredCount,
      plannedAmount: totalSol.toFixed(6),
      actualAmount: actualDistributionAmount.toFixed(6),
      difference: (totalSol - actualDistributionAmount).toFixed(6),
    });

    // Apply max recipients limit
    if (distribution.length > this.config.maxRecipientsPerRun) {
      logger.warn(
        `Limiting to ${this.config.maxRecipientsPerRun} recipients (was ${distribution.length})`
      );
      return distribution.slice(0, this.config.maxRecipientsPerRun);
    }

    return distribution;
  }

  /**
   * Execute batch SOL transfers
   */
  private async executeBatchTransfers(
    distribution: HolderDistribution[]
  ): Promise<string[]> {
    logger.info('📤 Executing batch transfers', {
      recipients: distribution.length,
    });

    const signatures: string[] = [];
    const BATCH_SIZE = 5; // Max transfers per transaction

    for (let i = 0; i < distribution.length; i += BATCH_SIZE) {
      const batch = distribution.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const signature = await this.sendBatch(batch);
        signatures.push(signature);

        logger.info(`✅ Batch ${batchNumber} sent`, {
          recipients: batch.length,
          signature,
        });

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < distribution.length) {
          await this.delay(500);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ Batch ${batchNumber} failed, trying individual`, {
          error: errorMsg,
        });

        // Fall back to individual transfers
        for (const recipient of batch) {
          try {
            const sig = await this.sendSingle(recipient);
            signatures.push(sig);
            logger.info(
              `✅ Individual transfer sent: ${recipient.wallet.toString().slice(0, 8)}...`
            );
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            logger.error(
              `❌ Failed to send to ${recipient.wallet.toString().slice(0, 8)}...`,
              { error: errMsg }
            );
          }
        }
      }
    }

    return signatures;
  }

  /**
   * Send batch of transfers in single transaction
   */
  private async sendBatch(recipients: HolderDistribution[]): Promise<string> {
    const instructions: TransactionInstruction[] = [];

    // Add priority fee instruction
    const priorityFee = await this.solanaService.calculatePriorityFee();
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });
    instructions.push(priorityFeeIx);

    // Add transfer instructions
    for (const recipient of recipients) {
      const lamports = Math.floor(recipient.solAmount * LAMPORTS_PER_SOL);

      const transferIx = SystemProgram.transfer({
        fromPubkey: this.config.payerWallet.publicKey,
        toPubkey: recipient.wallet,
        lamports,
      });

      instructions.push(transferIx);
    }

    const transaction = await this.txService.buildTransaction(
      instructions,
      this.config.payerWallet.publicKey
    );

    const signature = await this.txService.sendAndConfirm(transaction, [
      this.config.payerWallet,
    ]);

    return signature;
  }

  /**
   * Send single transfer
   */
  private async sendSingle(recipient: HolderDistribution): Promise<string> {
    const lamports = Math.floor(recipient.solAmount * LAMPORTS_PER_SOL);

    const priorityFee = await this.solanaService.calculatePriorityFee();
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });

    const transferIx = SystemProgram.transfer({
      fromPubkey: this.config.payerWallet.publicKey,
      toPubkey: recipient.wallet,
      lamports,
    });

    const transaction = await this.txService.buildTransaction(
      [priorityFeeIx, transferIx],
      this.config.payerWallet.publicKey
    );

    const signature = await this.txService.sendAndConfirm(transaction, [
      this.config.payerWallet,
    ]);

    return signature;
  }

  /**
   * Update stats after distribution
   */
  private updateStats(record: AirdropRecord): void {
    this.stats.totalDistributed += record.totalAmount;
    this.stats.distributionCount++;
    this.stats.lastDistributionTime = new Date();
    this.stats.distributionHistory.push(record);

    for (const recipient of record.recipients) {
      this.stats.uniqueRecipients.add(recipient.wallet);
    }
  }

  /**
   * Get current stats
   */
  getStats(): AirdropStats {
    return {
      ...this.stats,
      uniqueRecipients: new Set(this.stats.uniqueRecipients),
      distributionHistory: [...this.stats.distributionHistory],
    };
  }

  /**
   * Get qualified holder count without executing distribution
   */
  async getQualifiedHolderCount(): Promise<number> {
    const holders = await this.getQualifiedHolders();
    return holders.length;
  }

  /**
   * Preview distribution without executing
   */
  async previewDistribution(
    amountSol: number
  ): Promise<{ recipientCount: number; recipients: AirdropRecipient[] }> {
    const holders = await this.getQualifiedHolders();
    const distribution = this.calculateDistribution(holders, amountSol);

    return {
      recipientCount: distribution.length,
      recipients: distribution.map((d) => ({
        wallet: d.wallet.toString(),
        tokenBalance: d.balance,
        solReceived: d.solAmount,
      })),
    };
  }

  /**
   * Export distribution history for transparency/dashboard
   */
  exportDistributionHistory(): AirdropRecord[] {
    return this.stats.distributionHistory.map((record) => ({
      ...record,
    }));
  }

  /**
   * Generate airdrop report string
   */
  generateReport(): string {
    const avgPerHolder =
      this.stats.distributionCount > 0
        ? this.stats.totalDistributed / this.stats.uniqueRecipients.size
        : 0;

    return `
🎁 AIRDROP REPORT
================
Total Distributed: ${this.stats.totalDistributed.toFixed(6)} SOL
Distribution Count: ${this.stats.distributionCount}
Unique Recipients: ${this.stats.uniqueRecipients.size}
Average per Holder: ${avgPerHolder.toFixed(6)} SOL
Last Distribution: ${this.stats.lastDistributionTime?.toISOString() || 'Never'}
    `.trim();
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
