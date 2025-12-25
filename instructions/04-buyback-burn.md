# Phase 4: Buyback & Burn Module

## Objective
Implement automated token buyback from the market and permanent burning to reduce supply, using 20% of collected fees to create deflationary pressure.

---

## Prompt for Claude

```
Build the buyback and burn module that purchases tokens from pump.fun and permanently removes them from circulation.

BUILD: src/modules/buybackBurn.ts

CONTEXT:
This module receives 20% of claimed creator fees and uses it to:
1. Buy tokens from the pump.fun bonding curve
2. Burn the purchased tokens permanently
3. Log burn events for transparency
4. Create deflationary tokenomics

Burning tokens reduces circulating supply, which can support price if demand remains constant or increases.

REQUIREMENTS:

1. Token Buyback
   - Execute buy transaction on pump.fun
   - Calculate expected token amount
   - Handle slippage appropriately
   - Confirm successful purchase
   - Track tokens acquired

2. Token Burning
   - Transfer tokens to burn address, OR
   - Use SPL token burn instruction (preferred)
   - Verify burn transaction success
   - Update burn statistics
   - Emit burn event

3. Transparency Logging
   - Record every burn event
   - Include: amount, SOL spent, timestamp, signature
   - Export data for public dashboard
   - Calculate total burned vs total supply

4. Safety Features
   - Dry-run mode for testing
   - Maximum burn amount per transaction
   - Validation before burning
   - Emergency stop capability

CLASS STRUCTURE:

```typescript
export interface BuybackBurnConfig {
  tokenAddress: string;
  bondingCurveAddress: string;
  associatedBondingCurve: PublicKey;
  burnWallet: Keypair;
  burnMethod: 'burn' | 'dead_address'; // 'burn' recommended
  deadAddress?: PublicKey; // If using dead address method
  slippageBps: number;
  dryRun: boolean;
  maxBurnPerTx: number; // Maximum tokens to burn per transaction
}

export interface BurnRecord {
  timestamp: Date;
  signature: string;
  tokenAmount: number;
  solSpent: number;
  pricePerToken: number;
  method: 'burn' | 'dead_address';
  success: boolean;
  error?: string;
}

export interface BuybackBurnStats {
  totalSolSpent: number;
  totalTokensBurned: number;
  burnCount: number;
  averagePricePerToken: number;
  lastBurnTime: Date | null;
  burnHistory: BurnRecord[];
}

export class BuybackBurner {
  private config: BuybackBurnConfig;
  private solanaService: SolanaService;
  private transactionService: TransactionService;
  private stats: BuybackBurnStats;

  constructor(
    config: BuybackBurnConfig,
    solanaService: SolanaService,
    transactionService: TransactionService
  ) {
    // Initialize
  }

  // Core methods
  async buybackAndBurn(solAmount: number): Promise<BurnRecord>;
  private async executeBuyback(solAmount: number): Promise<{ tokens: number; signature: string }>;
  private async burnTokens(tokenAmount: number): Promise<string>;

  // Burn methods
  private async burnViaInstruction(tokenAmount: number): Promise<string>;
  private async burnViaDeadAddress(tokenAmount: number): Promise<string>;

  // Utilities
  getStats(): BuybackBurnStats;
  async getTotalSupply(): Promise<number>;
  async getBurnPercentage(): Promise<number>;
  exportBurnHistory(): BurnRecord[];
}
```

BUYBACK EXECUTION:

```typescript
private async executeBuyback(
  solAmount: number
): Promise<{ tokens: number; signature: string }> {
  logger.info('💰 Executing buyback', { solAmount });

  const { tokenAddress, bondingCurveAddress, associatedBondingCurve, slippageBps, burnWallet } =
    this.config;

  // Calculate expected tokens based on bonding curve
  const expectedTokens = await this.calculateExpectedTokens(solAmount);
  const minTokensOut = expectedTokens * (1 - slippageBps / 10000);

  logger.info('Expected tokens', {
    expected: expectedTokens,
    minimum: minTokensOut,
    slippage: `${slippageBps / 100}%`,
  });

  // Get or create burn wallet's token account
  const burnTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    burnWallet.publicKey
  );

  // Check if account exists, create if needed
  const accountInfo = await this.solanaService
    .getConnection()
    .getAccountInfo(burnTokenAccount);

  const instructions: TransactionInstruction[] = [];

  if (!accountInfo) {
    // Create associated token account
    const createAtaIx = createAssociatedTokenAccountInstruction(
      burnWallet.publicKey, // payer
      burnTokenAccount,
      burnWallet.publicKey, // owner
      new PublicKey(tokenAddress) // mint
    );
    instructions.push(createAtaIx);
  }

  // Build buy instruction
  const buyIx = await this.pumpFunProgram.methods
    .buy(
      new BN(solAmount * LAMPORTS_PER_SOL),
      new BN(Math.floor(minTokensOut))
    )
    .accounts({
      global: GLOBAL_ACCOUNT,
      feeRecipient: FEE_RECIPIENT,
      mint: new PublicKey(tokenAddress),
      bondingCurve: new PublicKey(bondingCurveAddress),
      associatedBondingCurve: associatedBondingCurve,
      associatedUser: burnTokenAccount,
      user: burnWallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: EVENT_AUTHORITY,
      program: PUMP_FUN_PROGRAM,
    })
    .instruction();

  instructions.push(buyIx);

  // Add priority fee
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, ...instructions);

  // Send and confirm
  const signature = await this.transactionService.sendAndConfirm(transaction, [burnWallet]);

  logger.info('✅ Buyback executed', { signature });

  // Get actual tokens received (fetch balance)
  const balance = await this.solanaService.getTokenBalance(
    burnWallet.publicKey,
    new PublicKey(tokenAddress)
  );

  return {
    tokens: balance,
    signature,
  };
}

private async calculateExpectedTokens(solAmount: number): Promise<number> {
  // Fetch bonding curve state
  const bondingCurveData = await this.solanaService
    .getConnection()
    .getAccountInfo(new PublicKey(this.config.bondingCurveAddress));

  if (!bondingCurveData) {
    throw new Error('Bonding curve not found');
  }

  // Parse bonding curve (simplified - use proper IDL parsing)
  // Bonding curve formula: tokens_out = (sol_in * virtualTokenReserves) / (virtualSolReserves + sol_in)
  const bondingCurve = this.parseBondingCurve(bondingCurveData.data);

  const solLamports = solAmount * LAMPORTS_PER_SOL;
  const tokensOut =
    (solLamports * bondingCurve.virtualTokenReserves) /
    (bondingCurve.virtualSolReserves + solLamports);

  return tokensOut;
}
```

BURN IMPLEMENTATION (SPL Token Burn - Recommended):

```typescript
private async burnViaInstruction(tokenAmount: number): Promise<string> {
  logger.info('🔥 Burning tokens via SPL instruction', { amount: tokenAmount });

  const { tokenAddress, burnWallet } = this.config;

  // Get burn wallet's token account
  const burnTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    burnWallet.publicKey
  );

  // Build burn instruction
  const burnIx = createBurnInstruction(
    burnTokenAccount, // token account
    new PublicKey(tokenAddress), // mint
    burnWallet.publicKey, // owner
    BigInt(Math.floor(tokenAmount)) // amount (as bigint)
  );

  // Add priority fee
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, burnIx);

  // Send and confirm
  const signature = await this.transactionService.sendAndConfirm(transaction, [burnWallet]);

  logger.info('✅ Tokens burned', { signature, amount: tokenAmount });

  return signature;
}
```

BURN IMPLEMENTATION (Dead Address - Alternative):

```typescript
private async burnViaDeadAddress(tokenAmount: number): Promise<string> {
  logger.info('🔥 Burning tokens to dead address', { amount: tokenAmount });

  const { tokenAddress, burnWallet, deadAddress } = this.config;

  if (!deadAddress) {
    throw new Error('Dead address not configured');
  }

  // Get source token account
  const sourceTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    burnWallet.publicKey
  );

  // Get or create dead address token account
  const deadTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    deadAddress
  );

  const instructions: TransactionInstruction[] = [];

  // Check if dead address token account exists
  const deadAccountInfo = await this.solanaService
    .getConnection()
    .getAccountInfo(deadTokenAccount);

  if (!deadAccountInfo) {
    // Create ATA for dead address
    const createAtaIx = createAssociatedTokenAccountInstruction(
      burnWallet.publicKey, // payer
      deadTokenAccount,
      deadAddress,
      new PublicKey(tokenAddress)
    );
    instructions.push(createAtaIx);
  }

  // Build transfer instruction
  const transferIx = createTransferInstruction(
    sourceTokenAccount,
    deadTokenAccount,
    burnWallet.publicKey,
    BigInt(Math.floor(tokenAmount))
  );

  instructions.push(transferIx);

  // Add priority fee
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, ...instructions);

  // Send and confirm
  const signature = await this.transactionService.sendAndConfirm(transaction, [burnWallet]);

  logger.info('✅ Tokens sent to dead address', { signature, amount: tokenAmount });

  return signature;
}
```

MAIN BUYBACK & BURN FLOW:

```typescript
async buybackAndBurn(solAmount: number): Promise<BurnRecord> {
  logger.info('🔥 Starting buyback & burn', { solAmount });

  const record: BurnRecord = {
    timestamp: new Date(),
    signature: '',
    tokenAmount: 0,
    solSpent: solAmount,
    pricePerToken: 0,
    method: this.config.burnMethod,
    success: false,
  };

  try {
    if (this.config.dryRun) {
      logger.info('[DRY RUN] Would buyback and burn', { solAmount });
      record.success = true;
      return record;
    }

    // Step 1: Buyback tokens
    const { tokens, signature: buySignature } = await this.executeBuyback(solAmount);

    logger.info('Tokens acquired', { tokens });

    record.tokenAmount = tokens;
    record.pricePerToken = solAmount / (tokens || 1);

    // Validate burn amount
    if (tokens > this.config.maxBurnPerTx) {
      throw new Error(
        `Burn amount ${tokens} exceeds maximum ${this.config.maxBurnPerTx}`
      );
    }

    // Step 2: Burn tokens
    let burnSignature: string;

    if (this.config.burnMethod === 'burn') {
      burnSignature = await this.burnViaInstruction(tokens);
    } else {
      burnSignature = await this.burnViaDeadAddress(tokens);
    }

    record.signature = burnSignature;
    record.success = true;

    // Update stats
    this.stats.totalSolSpent += solAmount;
    this.stats.totalTokensBurned += tokens;
    this.stats.burnCount++;
    this.stats.lastBurnTime = new Date();
    this.stats.averagePricePerToken =
      this.stats.totalSolSpent / this.stats.totalTokensBurned;

    this.stats.burnHistory.push(record);

    logger.info('✅ Buyback & burn complete', {
      tokens,
      solSpent: solAmount,
      signature: burnSignature,
    });

    return record;

  } catch (error) {
    logger.error('Buyback & burn failed', { error });
    record.error = error.message;
    this.stats.burnHistory.push(record);
    throw error;
  }
}
```

TRANSPARENCY UTILITIES:

```typescript
async getBurnPercentage(): Promise<number> {
  const totalSupply = await this.getTotalSupply();
  return (this.stats.totalTokensBurned / totalSupply) * 100;
}

async getTotalSupply(): Promise<number> {
  const mintInfo = await getMint(
    this.solanaService.getConnection(),
    new PublicKey(this.config.tokenAddress)
  );
  return Number(mintInfo.supply);
}

exportBurnHistory(): BurnRecord[] {
  // Export for dashboard/website
  return this.stats.burnHistory.map(record => ({
    ...record,
    timestamp: record.timestamp.toISOString(),
  }));
}

// Generate burn report
generateBurnReport(): string {
  const totalSupply = await this.getTotalSupply();
  const burnPercentage = await this.getBurnPercentage();

  return `
🔥 BURN REPORT
==============
Total Tokens Burned: ${this.stats.totalTokensBurned.toLocaleString()}
Total SOL Spent: ${this.stats.totalSolSpent.toFixed(4)}
Burn Count: ${this.stats.burnCount}
Average Price: ${this.stats.averagePricePerToken.toFixed(8)} SOL/token
Burn Percentage: ${burnPercentage.toFixed(2)}% of total supply
Last Burn: ${this.stats.lastBurnTime?.toISOString() || 'Never'}
  `.trim();
}
```

ERROR HANDLING:
- Buyback failures → log and throw (don't burn if buy fails)
- Burn failures → critical error, needs investigation
- Insufficient balance → validate before attempting
- RPC errors → retry with backoff

LOGGING:
- Every buyback attempt and result
- Every burn transaction
- Running statistics
- Burn percentage updates
- Any errors with full context

SAFETY CHECKS:
- Verify token account exists before burning
- Validate burn amount is reasonable
- Check wallet has enough SOL for transactions
- Confirm burn transaction success
- Maximum burn per transaction enforced
```

---

## Success Criteria

- [ ] BuybackBurner class fully implemented
- [ ] Can execute buyback from pump.fun
- [ ] SPL token burn instruction works
- [ ] Burn events logged correctly
- [ ] Stats tracking accurate
- [ ] Burn percentage calculation works
- [ ] Dry-run mode functions
- [ ] Error handling prevents data loss

---

## Testing Strategy

1. **Dry-Run Testing**:
   ```typescript
   const burner = new BuybackBurner({
     // ... config
     dryRun: true,
   }, solanaService, transactionService);

   await burner.buybackAndBurn(0.01); // Logs but doesn't execute
   ```

2. **Devnet Testing**:
   - Use devnet token
   - Test buyback with small amounts
   - Verify tokens burned (check supply reduction)

3. **Mainnet Testing**:
   - Start with tiny amount (0.001 SOL)
   - Verify on Solscan
   - Check burn address on explorer

---

## Recommended Burn Method

**Use Dead Address Transfer** because:
- ✅ Fully trackable on Solscan - can see all burned tokens accumulating
- ✅ Public verification - anyone can check the dead address balance
- ✅ Visual proof of burns over time
- ✅ More intuitive for community to verify

**Dead Address:** `1nc1neทatoท1111111111111111111111111111111` (standard Solana burn address)

---

## Required Imports

```typescript
import {
  createBurnInstruction,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';

import {
  Transaction,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';
```

---

## Dependencies

- ✅ Phase 1: SolanaService, TransactionService
- Pump.fun program for buyback
- SPL Token program for burning

---

## Next Phase

After implementing buyback & burn, proceed to:
👉 **Phase 5**: `05-airdrop-distributor.md`

---

## Questions to Resolve

1. Which burn method do you prefer? (Recommend: SPL burn instruction)
2. What's the maximum burn per transaction? (Recommend: 10% of supply)
3. Should burn history be exported to a file for transparency?
4. How often should burn reports be generated?
