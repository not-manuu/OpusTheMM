# Phase 3: Volume Creation Module

## Objective
Build a multi-wallet trading system that uses 20% of collected fees to create organic-looking trading volume on pump.fun, supporting token visibility and price action.

---

## Prompt for Claude

```
Implement the volume creation module that executes strategic buy transactions across multiple wallets to create natural-looking trading activity.

BUILD: src/modules/volumeCreator.ts

CONTEXT:
This module receives 20% of claimed creator fees and uses it to execute buy transactions on pump.fun. The goal is to create trading volume that:
- Appears organic (randomized amounts, timing, wallets)
- Supports price discovery
- Increases token visibility on pump.fun
- Helps maintain healthy trading activity

REQUIREMENTS:

1. Multi-Wallet Trading
   - Distribute buys across 3-8 different wallets
   - Randomize wallet selection
   - Never use the same wallet consecutively
   - Track wallet usage and cooldowns

2. Transaction Timing
   - Randomize delays between trades (5-30 seconds)
   - Avoid predictable patterns
   - Respect rate limits
   - Implement cooldown periods

3. Amount Distribution
   - Split total SOL into random-sized chunks
   - Ensure each trade is meaningful (min 0.001 SOL)
   - Vary trade sizes for realism
   - Sum equals exactly the allocated amount

4. Pump.fun Buy Execution
   - Build buy instruction using pump.fun program
   - Calculate expected token output
   - Handle slippage
   - Confirm successful purchase

5. Safety Features
   - Dry-run mode for testing
   - Maximum per-trade limit
   - Emergency stop mechanism
   - Transaction validation before sending

CLASS STRUCTURE:

```typescript
export interface VolumeCreatorConfig {
  tokenAddress: string;
  bondingCurveAddress: string;
  associatedBondingCurve: PublicKey;
  volumeWallets: Keypair[];
  minTradeAmount: number; // SOL
  maxTradeAmount: number; // SOL
  minDelaySeconds: number;
  maxDelaySeconds: number;
  slippageBps: number; // basis points (e.g., 300 = 3%)
  dryRun: boolean;
}

export interface VolumeStats {
  totalVolume: number;
  tradeCount: number;
  successfulTrades: number;
  failedTrades: number;
  totalTokensBought: number;
  averagePrice: number;
  lastTradeTime: Date | null;
  walletUsage: Map<string, number>; // wallet address -> trade count
}

export class VolumeCreator {
  private config: VolumeCreatorConfig;
  private solanaService: SolanaService;
  private transactionService: TransactionService;
  private stats: VolumeStats;
  private walletCooldowns: Map<string, Date>;
  private isActive: boolean;

  constructor(
    config: VolumeCreatorConfig,
    solanaService: SolanaService,
    transactionService: TransactionService
  ) {
    // Initialize
  }

  // Core methods
  async createVolume(totalSolAmount: number): Promise<void>;
  private async executeTrade(wallet: Keypair, amount: number): Promise<void>;
  private selectWallet(): Keypair;
  private splitAmount(total: number, parts: number): number[];
  private async waitRandomDelay(): Promise<void>;

  // Pump.fun integration
  private async buildBuyInstruction(
    wallet: Keypair,
    solAmount: number
  ): Promise<TransactionInstruction>;
  private async calculateExpectedTokens(solAmount: number): Promise<number>;

  // Utilities
  getStats(): VolumeStats;
  async estimateCost(solAmount: number): Promise<number>;
  reset(): void;
}
```

AMOUNT DISTRIBUTION ALGORITHM:

```typescript
private splitAmount(total: number, numTrades: number): number[] {
  const { minTradeAmount, maxTradeAmount } = this.config;

  // Generate random weights
  const weights: number[] = [];
  for (let i = 0; i < numTrades; i++) {
    weights.push(Math.random() * 0.5 + 0.5); // Random between 0.5 and 1.0
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Calculate amounts based on weights
  let amounts = weights.map(w => (w / totalWeight) * total);

  // Ensure each amount is within bounds
  amounts = amounts.map(amt => {
    if (amt < minTradeAmount) return minTradeAmount;
    if (amt > maxTradeAmount) return maxTradeAmount;
    return amt;
  });

  // Adjust to match exact total
  const currentTotal = amounts.reduce((sum, amt) => sum + amt, 0);
  const adjustment = total - currentTotal;
  amounts[0] += adjustment; // Add difference to first trade

  // Shuffle for randomness
  return this.shuffleArray(amounts);
}

private shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

WALLET SELECTION:

```typescript
private selectWallet(): Keypair {
  const now = new Date();
  const availableWallets = this.config.volumeWallets.filter(wallet => {
    const cooldownEnd = this.walletCooldowns.get(wallet.publicKey.toString());
    return !cooldownEnd || now > cooldownEnd;
  });

  if (availableWallets.length === 0) {
    logger.warn('No wallets available, using oldest cooldown');
    return this.config.volumeWallets[0];
  }

  // Select random wallet from available
  const randomIndex = Math.floor(Math.random() * availableWallets.length);
  const selectedWallet = availableWallets[randomIndex];

  // Set cooldown (30 seconds)
  const cooldownEnd = new Date(now.getTime() + 30000);
  this.walletCooldowns.set(selectedWallet.publicKey.toString(), cooldownEnd);

  return selectedWallet;
}
```

PUMP.FUN BUY INSTRUCTION:

```typescript
private async buildBuyInstruction(
  wallet: Keypair,
  solAmount: number
): Promise<TransactionInstruction> {
  const { tokenAddress, bondingCurveAddress, associatedBondingCurve, slippageBps } = this.config;

  // Calculate expected token output based on bonding curve
  const expectedTokens = await this.calculateExpectedTokens(solAmount);

  // Apply slippage tolerance
  const minTokensOut = expectedTokens * (1 - slippageBps / 10000);

  // Get or create user's associated token account
  const userTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    wallet.publicKey
  );

  // Build buy instruction using pump.fun program
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
      associatedUser: userTokenAccount,
      user: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: EVENT_AUTHORITY,
      program: PUMP_FUN_PROGRAM,
    })
    .instruction();

  return buyIx;
}

private async calculateExpectedTokens(solAmount: number): Promise<number> {
  // Fetch bonding curve state
  const bondingCurve = await this.getBondingCurveState();

  // Bonding curve formula: tokens_out = (sol_in * virtualTokenReserves) / (virtualSolReserves + sol_in)
  const solLamports = solAmount * LAMPORTS_PER_SOL;
  const tokensOut =
    (solLamports * bondingCurve.virtualTokenReserves.toNumber()) /
    (bondingCurve.virtualSolReserves.toNumber() + solLamports);

  return tokensOut;
}
```

MAIN VOLUME CREATION FLOW:

```typescript
async createVolume(totalSolAmount: number): Promise<void> {
  logger.info('🔊 Starting volume creation', { totalSol: totalSolAmount });

  this.isActive = true;

  try {
    // Determine number of trades (3-8)
    const numTrades = Math.floor(Math.random() * 6) + 3; // 3 to 8 trades

    // Split amount across trades
    const tradeAmounts = this.splitAmount(totalSolAmount, numTrades);

    logger.info(`Split into ${numTrades} trades`, {
      amounts: tradeAmounts.map(a => a.toFixed(4)),
    });

    // Execute trades sequentially with delays
    for (let i = 0; i < tradeAmounts.length; i++) {
      if (!this.isActive) {
        logger.warn('Volume creation stopped');
        break;
      }

      const amount = tradeAmounts[i];
      const wallet = this.selectWallet();

      logger.info(`Trade ${i + 1}/${numTrades}`, {
        wallet: wallet.publicKey.toString().slice(0, 8),
        amount: amount.toFixed(4),
      });

      try {
        await this.executeTrade(wallet, amount);
        this.stats.successfulTrades++;
        this.stats.totalVolume += amount;
      } catch (error) {
        logger.error(`Trade ${i + 1} failed`, { error, amount });
        this.stats.failedTrades++;
        // Continue with next trade
      }

      // Random delay before next trade (except after last trade)
      if (i < tradeAmounts.length - 1) {
        await this.waitRandomDelay();
      }
    }

    logger.info('✅ Volume creation complete', {
      total: totalSolAmount,
      successful: this.stats.successfulTrades,
      failed: this.stats.failedTrades,
    });

  } catch (error) {
    logger.error('Volume creation failed', { error });
    throw error;
  } finally {
    this.isActive = false;
  }
}

private async executeTrade(wallet: Keypair, amount: number): Promise<void> {
  if (this.config.dryRun) {
    logger.info('[DRY RUN] Would execute trade', { wallet: wallet.publicKey.toString(), amount });
    await new Promise(resolve => setTimeout(resolve, 100));
    return;
  }

  // Build transaction
  const buyIx = await this.buildBuyInstruction(wallet, amount);
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await this.solanaService.calculatePriorityFee(),
  });

  const transaction = new Transaction().add(priorityFeeIx, buyIx);

  // Send and confirm
  const signature = await this.transactionService.sendAndConfirm(transaction, [wallet]);

  logger.info('✅ Trade executed', { signature, amount });

  // Update wallet usage
  const walletKey = wallet.publicKey.toString();
  this.stats.walletUsage.set(
    walletKey,
    (this.stats.walletUsage.get(walletKey) || 0) + 1
  );

  this.stats.lastTradeTime = new Date();
  this.stats.tradeCount++;
}

private async waitRandomDelay(): Promise<void> {
  const { minDelaySeconds, maxDelaySeconds } = this.config;
  const delayMs =
    (minDelaySeconds + Math.random() * (maxDelaySeconds - minDelaySeconds)) * 1000;

  logger.debug(`Waiting ${(delayMs / 1000).toFixed(1)}s before next trade`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
```

ERROR HANDLING:
- Individual trade failures don't halt entire volume creation
- Log all failures with context
- Track success/failure rates
- Retry failed trades up to 2 times
- Emergency stop if too many consecutive failures

SAFETY CHECKS:
- Verify wallet has enough SOL before trading
- Validate bonding curve is active (not graduated)
- Check token exists and is tradable
- Simulate transaction before sending (optional)
- Maximum total volume per call (safety limit)

LOGGING:
- Volume creation start/end
- Each trade with wallet and amount
- Success/failure status
- Running statistics
- Any anomalies or warnings
```

---

## Success Criteria

- [ ] VolumeCreator class fully implemented
- [ ] Can split SOL into random trade amounts
- [ ] Wallet selection with cooldowns works
- [ ] Buy instruction builds correctly for pump.fun
- [ ] Trades execute successfully on devnet
- [ ] Random timing delays work
- [ ] Dry-run mode functions
- [ ] Stats tracking accurate
- [ ] Error handling prevents crashes

---

## Testing Strategy

1. **Dry-Run Testing**:
   ```typescript
   const creator = new VolumeCreator({
     // ... config
     dryRun: true,
   }, solanaService, transactionService);

   await creator.createVolume(0.1); // Logs but doesn't execute
   ```

2. **Devnet Testing**:
   - Use devnet SOL
   - Test with small amounts (0.01-0.05 SOL)
   - Verify trades appear on pump.fun

3. **Mainnet Testing**:
   - Start with tiny amounts (0.001-0.005 SOL)
   - Verify on pump.fun analytics
   - Check token balance increases

---

## Required Constants

```typescript
// In src/config/constants.ts
export const PUMP_FUN_PROGRAM = new PublicKey(
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
);

export const GLOBAL_ACCOUNT = new PublicKey(
  '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'
);

export const FEE_RECIPIENT = new PublicKey(
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'
);

export const EVENT_AUTHORITY = new PublicKey(
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'
);
```

---

## Dependencies

- ✅ Phase 1: SolanaService, TransactionService
- Pump.fun program IDL (from reference repo)
- Multiple funded wallets (for volume trading)

---

## Security Considerations

1. **Wallet Management**:
   - Each volume wallet should have limited SOL
   - Never use creator wallet for volume
   - Wallets should be dedicated to this purpose

2. **Transaction Safety**:
   - Always simulate before sending
   - Set reasonable slippage limits
   - Monitor for failed transactions

3. **Compliance**:
   - Volume creation is legitimate on pump.fun
   - Ensure transparency in tokenomics documentation
   - Not wash trading (buying from yourself)

---

## Next Phase

After implementing volume creation, proceed to:
👉 **Phase 4**: `04-buyback-burn.md`

---

## Questions to Resolve

1. How many volume wallets do you want to use? (Recommend 5-10)
2. What's the minimum trade size? (Recommend 0.001 SOL)
3. What slippage tolerance? (Recommend 3-5%)
4. Should failed trades be retried immediately or skipped?
