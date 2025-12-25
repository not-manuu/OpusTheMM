# Phase 5: Airdrop Distribution Module

## Objective
Implement automated SOL airdrops to token holders, using 20% of collected fees to reward loyal holders proportionally based on their token holdings.

---

## Prompt for Claude

```
Build the airdrop distribution module that identifies qualified token holders and distributes SOL proportionally to their holdings.

BUILD: src/modules/airdropDistributor.ts

CONTEXT:
This module receives 20% of claimed creator fees and distributes it as SOL to token holders who meet minimum holding requirements. This creates:
- Holder rewards and incentives
- Community engagement
- Reduced selling pressure
- Loyalty rewards for long-term holders

REQUIREMENTS:

1. Holder Snapshot System
   - Query all token holders from blockchain
   - Filter by minimum holding threshold
   - Calculate proportional distribution
   - Handle large holder lists efficiently

2. Distribution Calculation
   - Proportional to token holdings
   - Minimum SOL threshold (avoid dust)
   - Exclude certain addresses (burn, creator, etc.)
   - Fair distribution algorithm

3. Mass SOL Transfer
   - Batch transfers for efficiency
   - Optimize transaction costs
   - Handle failed transfers gracefully
   - Retry logic for temporary failures

4. Transparency & Reporting
   - Log every airdrop event
   - Track distribution history
   - Generate holder reports
   - Export data for community

5. Safety Features
   - Dry-run mode for testing
   - Maximum recipients per run
   - Validation before sending
   - Emergency stop capability

CLASS STRUCTURE:

```typescript
export interface AirdropConfig {
  tokenAddress: string;
  distributorWallet: Keypair;
  minHoldingThreshold: number; // Minimum tokens to qualify
  minAirdropAmount: number; // Minimum SOL to send (avoid dust)
  maxRecipientsPerRun: number; // Safety limit
  excludeAddresses: string[]; // Addresses to exclude (burn, creator, etc.)
  dryRun: boolean;
}

export interface HolderData {
  address: string;
  balance: number;
  percentage: number;
  airdropAmount: number;
}

export interface AirdropRecord {
  timestamp: Date;
  totalAmount: number;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  holders: HolderData[];
  signatures: string[];
  success: boolean;
  errors?: string[];
}

export interface AirdropStats {
  totalDistributed: number;
  totalRecipients: number;
  distributionCount: number;
  averagePerHolder: number;
  lastDistributionTime: Date | null;
  distributionHistory: AirdropRecord[];
}

export class AirdropDistributor {
  private config: AirdropConfig;
  private solanaService: SolanaService;
  private transactionService: TransactionService;
  private stats: AirdropStats;

  constructor(
    config: AirdropConfig,
    solanaService: SolanaService,
    transactionService: TransactionService
  ) {
    // Initialize
  }

  // Core methods
  async distribute(totalSolAmount: number): Promise<AirdropRecord>;
  private async getQualifiedHolders(): Promise<Map<string, number>>;
  private calculateDistribution(
    holders: Map<string, number>,
    totalSol: number
  ): HolderData[];
  private async executeAirdrop(holders: HolderData[]): Promise<string[]>;

  // Holder queries
  private async getAllTokenHolders(): Promise<Map<string, number>>;
  private filterHolders(holders: Map<string, number>): Map<string, number>;

  // Transfer optimization
  private async batchTransfer(recipients: HolderData[]): Promise<string[]>;
  private buildTransferInstructions(recipients: HolderData[]): TransactionInstruction[];

  // Utilities
  getStats(): AirdropStats;
  async getHolderCount(): Promise<number>;
  exportDistributionHistory(): AirdropRecord[];
}
```

HOLDER SNAPSHOT:

```typescript
private async getAllTokenHolders(): Promise<Map<string, number>> {
  logger.info('📊 Fetching all token holders...');

  const { tokenAddress } = this.config;
  const connection = this.solanaService.getConnection();

  // Get all token accounts for this mint
  const tokenAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // Token account size
      },
      {
        memcmp: {
          offset: 0, // Mint address offset in token account
          bytes: tokenAddress,
        },
      },
    ],
  });

  logger.info(`Found ${tokenAccounts.length} token accounts`);

  const holders = new Map<string, number>();

  for (const { pubkey, account } of tokenAccounts) {
    // Parse token account data
    const data = AccountLayout.decode(account.data);
    const owner = new PublicKey(data.owner).toString();
    const balance = Number(data.amount);

    if (balance > 0) {
      // Aggregate if holder has multiple token accounts
      const currentBalance = holders.get(owner) || 0;
      holders.set(owner, currentBalance + balance);
    }
  }

  logger.info(`Total unique holders: ${holders.size}`);

  return holders;
}

private filterHolders(holders: Map<string, number>): Map<string, number> {
  const { minHoldingThreshold, excludeAddresses } = this.config;

  const filtered = new Map<string, number>();

  for (const [address, balance] of holders.entries()) {
    // Skip excluded addresses
    if (excludeAddresses.includes(address)) {
      logger.debug(`Excluding address: ${address}`);
      continue;
    }

    // Skip if below threshold
    if (balance < minHoldingThreshold) {
      continue;
    }

    filtered.set(address, balance);
  }

  logger.info(`Qualified holders: ${filtered.size} (after filtering)`);

  return filtered;
}

private async getQualifiedHolders(): Promise<Map<string, number>> {
  const allHolders = await this.getAllTokenHolders();
  return this.filterHolders(allHolders);
}
```

DISTRIBUTION CALCULATION:

```typescript
private calculateDistribution(
  holders: Map<string, number>,
  totalSol: number
): HolderData[] {
  logger.info('💰 Calculating distribution', {
    holders: holders.size,
    totalSol,
  });

  // Calculate total tokens held
  let totalTokens = 0;
  for (const balance of holders.values()) {
    totalTokens += balance;
  }

  const distribution: HolderData[] = [];

  for (const [address, balance] of holders.entries()) {
    // Calculate proportional share
    const percentage = (balance / totalTokens) * 100;
    const airdropAmount = (balance / totalTokens) * totalSol;

    // Skip if below minimum airdrop amount (avoid dust)
    if (airdropAmount < this.config.minAirdropAmount) {
      logger.debug(`Skipping ${address}: amount too small (${airdropAmount})`);
      continue;
    }

    distribution.push({
      address,
      balance,
      percentage,
      airdropAmount,
    });
  }

  // Sort by airdrop amount (largest first)
  distribution.sort((a, b) => b.airdropAmount - a.airdropAmount);

  // Apply max recipients limit
  if (distribution.length > this.config.maxRecipientsPerRun) {
    logger.warn(
      `Limiting to ${this.config.maxRecipientsPerRun} recipients (was ${distribution.length})`
    );
    return distribution.slice(0, this.config.maxRecipientsPerRun);
  }

  logger.info(`Distribution calculated for ${distribution.length} holders`);

  return distribution;
}
```

BATCH TRANSFER OPTIMIZATION:

```typescript
private async batchTransfer(recipients: HolderData[]): Promise<string[]> {
  logger.info('📤 Executing batch transfer', { recipients: recipients.length });

  const signatures: string[] = [];
  const BATCH_SIZE = 5; // Send 5 transfers per transaction

  // Split into batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      const signature = await this.sendBatch(batch);
      signatures.push(signature);

      logger.info(`✅ Batch ${i / BATCH_SIZE + 1} sent`, {
        recipients: batch.length,
        signature,
      });

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      logger.error(`❌ Batch ${i / BATCH_SIZE + 1} failed`, { error });

      // Try sending individually
      for (const recipient of batch) {
        try {
          const sig = await this.sendSingle(recipient);
          signatures.push(sig);
          logger.info(`✅ Individual transfer sent: ${recipient.address}`);
        } catch (err) {
          logger.error(`❌ Failed to send to ${recipient.address}`, { err });
        }
      }
    }
  }

  return signatures;
}

private async sendBatch(recipients: HolderData[]): Promise<string> {
  const instructions: TransactionInstruction[] = [];

  for (const recipient of recipients) {
    const transferIx = SystemProgram.transfer({
      fromPubkey: this.config.distributorWallet.publicKey,
      toPubkey: new PublicKey(recipient.address),
      lamports: Math.floor(recipient.airdropAmount * LAMPORTS_PER_SOL),
    });

    instructions.push(transferIx);
  }

  // Add priority fee
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, ...instructions);

  const signature = await this.transactionService.sendAndConfirm(
    transaction,
    [this.config.distributorWallet]
  );

  return signature;
}

private async sendSingle(recipient: HolderData): Promise<string> {
  const transferIx = SystemProgram.transfer({
    fromPubkey: this.config.distributorWallet.publicKey,
    toPubkey: new PublicKey(recipient.address),
    lamports: Math.floor(recipient.airdropAmount * LAMPORTS_PER_SOL),
  });

  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, transferIx);

  const signature = await this.transactionService.sendAndConfirm(
    transaction,
    [this.config.distributorWallet]
  );

  return signature;
}
```

MAIN DISTRIBUTION FLOW:

```typescript
async distribute(totalSolAmount: number): Promise<AirdropRecord> {
  logger.info('🎁 Starting airdrop distribution', { totalSol: totalSolAmount });

  const record: AirdropRecord = {
    timestamp: new Date(),
    totalAmount: totalSolAmount,
    recipientCount: 0,
    successCount: 0,
    failureCount: 0,
    holders: [],
    signatures: [],
    success: false,
    errors: [],
  };

  try {
    if (this.config.dryRun) {
      logger.info('[DRY RUN] Would distribute airdrops', { totalSolAmount });
      const holders = await this.getQualifiedHolders();
      const distribution = this.calculateDistribution(holders, totalSolAmount);

      record.holders = distribution;
      record.recipientCount = distribution.length;
      record.success = true;

      // Log dry run results
      logger.info('[DRY RUN] Distribution plan:', {
        recipients: distribution.length,
        totalAmount: totalSolAmount,
        topRecipients: distribution.slice(0, 5),
      });

      return record;
    }

    // Step 1: Get qualified holders
    const holders = await this.getQualifiedHolders();

    if (holders.size === 0) {
      logger.warn('No qualified holders found');
      record.success = true; // Not an error, just no recipients
      return record;
    }

    // Step 2: Calculate distribution
    const distribution = this.calculateDistribution(holders, totalSolAmount);

    record.holders = distribution;
    record.recipientCount = distribution.length;

    logger.info('Distribution breakdown:', {
      recipients: distribution.length,
      totalAmount: totalSolAmount,
      averagePerHolder: totalSolAmount / distribution.length,
    });

    // Step 3: Execute transfers
    const signatures = await this.batchTransfer(distribution);

    record.signatures = signatures;
    record.successCount = signatures.length;
    record.failureCount = distribution.length - signatures.length;
    record.success = record.failureCount === 0;

    // Update stats
    this.stats.totalDistributed += totalSolAmount;
    this.stats.totalRecipients += record.successCount;
    this.stats.distributionCount++;
    this.stats.lastDistributionTime = new Date();
    this.stats.averagePerHolder = this.stats.totalDistributed / this.stats.totalRecipients;

    this.stats.distributionHistory.push(record);

    logger.info('✅ Airdrop distribution complete', {
      recipients: record.recipientCount,
      successful: record.successCount,
      failed: record.failureCount,
      totalAmount: totalSolAmount,
    });

    return record;

  } catch (error) {
    logger.error('Airdrop distribution failed', { error });
    record.errors!.push(error.message);
    this.stats.distributionHistory.push(record);
    throw error;
  }
}
```

REPORTING UTILITIES:

```typescript
async getHolderCount(): Promise<number> {
  const holders = await this.getQualifiedHolders();
  return holders.size;
}

exportDistributionHistory(): AirdropRecord[] {
  return this.stats.distributionHistory.map(record => ({
    ...record,
    timestamp: record.timestamp.toISOString(),
  }));
}

// Generate distribution report
generateReport(record: AirdropRecord): string {
  const top10 = record.holders.slice(0, 10);

  return `
🎁 AIRDROP REPORT
================
Total Distributed: ${record.totalAmount.toFixed(4)} SOL
Recipients: ${record.recipientCount}
Successful: ${record.successCount}
Failed: ${record.failureCount}
Average per Holder: ${(record.totalAmount / record.recipientCount).toFixed(6)} SOL

Top 10 Recipients:
${top10.map((h, i) => `${i + 1}. ${h.address.slice(0, 8)}... - ${h.airdropAmount.toFixed(6)} SOL (${h.percentage.toFixed(2)}%)`).join('\n')}

Signatures:
${record.signatures.slice(0, 3).join('\n')}
${record.signatures.length > 3 ? `... and ${record.signatures.length - 3} more` : ''}
  `.trim();
}
```

ERROR HANDLING:
- Holder query failures → retry with exponential backoff
- Individual transfer failures → log and continue
- Batch failures → fall back to individual transfers
- Insufficient balance → validate before attempting

LOGGING:
- Holder snapshot details
- Distribution calculation
- Each batch transfer
- Individual failures
- Final summary

SAFETY CHECKS:
- Verify distributor wallet has enough SOL
- Validate all recipient addresses
- Check minimum airdrop amounts
- Enforce maximum recipients limit
- Confirm transactions before marking success
```

---

## Success Criteria

- [ ] AirdropDistributor class fully implemented
- [ ] Can query all token holders
- [ ] Filtering by minimum threshold works
- [ ] Proportional distribution calculated correctly
- [ ] Batch transfers execute successfully
- [ ] Failed transfers handled gracefully
- [ ] Stats tracking accurate
- [ ] Dry-run mode shows distribution plan

---

## Testing Strategy

1. **Dry-Run Testing**:
   ```typescript
   const distributor = new AirdropDistributor({
     // ... config
     dryRun: true,
   }, solanaService, transactionService);

   const record = await distributor.distribute(0.1);
   console.log(record.holders); // See distribution plan
   ```

2. **Devnet Testing**:
   - Use devnet token with test holders
   - Distribute small amounts
   - Verify recipients receive SOL

3. **Mainnet Testing**:
   - Start with tiny amount (0.01 SOL total)
   - Limited recipients (maxRecipientsPerRun: 10)
   - Verify on Solscan

---

## Optimization Tips

1. **Holder Query Optimization**:
   - Cache holder snapshot for 1 hour
   - Use getProgramAccounts with filters
   - Consider using RPC getProgramAccounts alternatives (Helius DAS API)

2. **Transfer Optimization**:
   - Batch multiple transfers per transaction
   - Use Jito bundles for guaranteed execution
   - Implement parallel batch sending

---

## Required Imports

```typescript
import {
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
```

---

## Dependencies

- ✅ Phase 1: SolanaService, TransactionService
- SPL Token program for holder queries

---

## Common Issues & Solutions

1. **Too many holders**: Use maxRecipientsPerRun and split across multiple runs
2. **Dust amounts**: Set reasonable minAirdropAmount (e.g., 0.001 SOL)
3. **RPC rate limits**: Add delays between batches
4. **Failed transfers**: Implement retry logic with individual transfers

---

## Next Phase

After implementing airdrop distribution, proceed to:
👉 **Phase 6**: `06-liquidity-injector.md`

---

## Questions to Resolve

1. What's the minimum holding threshold? (Recommend: 1M tokens)
2. What's the minimum airdrop amount? (Recommend: 0.001 SOL)
3. Maximum recipients per run? (Recommend: 100-500 depending on RPC)
4. Should holder snapshots be cached? How long?
