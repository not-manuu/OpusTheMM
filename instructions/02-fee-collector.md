# Phase 2: Fee Collection Module

## Objective
Implement automated creator fee monitoring and collection from pump.fun, with automatic distribution triggering based on the 5-way tokenomics split.

---

## Prompt for Claude

```
Build the fee collection module that monitors pump.fun creator fees, claims them automatically, and triggers distribution to the 5 tokenomics categories.

BUILD: src/modules/feeCollector.ts

CONTEXT:
On pump.fun, creators earn 0.05% of all trading volume for their token. These fees accumulate in the bonding curve and need to be claimed.

**🎅 Frostbyte fee distribution:**
- 25% → Reindeer 1 (Volume Creation)
- 25% → Reindeer 2 (Buyback & Burn)
- 25% → Reindeer 3 (Holder Airdrops)
- 25% → Reindeer 4 (Treasury/Operations)

REQUIREMENTS:

1. Fee Monitoring
   - Query pump.fun bonding curve for creator fee balance
   - Check fee balance on a configured interval (e.g., every 30 seconds)
   - Track accumulated fees over time
   - Log fee accrual events

2. Fee Claiming
   - Build "claim_fee" instruction for pump.fun program
   - Submit claim transaction when fees > minimum threshold
   - Confirm successful claim
   - Update internal tracking

3. Distribution Triggering
   - Calculate 5-way split (20% each)
   - Trigger each distribution module sequentially
   - Log distribution events
   - Handle distribution failures gracefully

4. Pump.fun Integration
   - Use pump.fun program IDL (pump_fun.json from reference repo)
   - Bonding curve account structure
   - Creator fee instruction format
   - Proper account derivation

CLASS STRUCTURE:

```typescript
export interface FeeCollectorConfig {
  tokenAddress: string;
  bondingCurveAddress: string;
  creatorWallet: Keypair;
  minimumClaimThreshold: number; // SOL amount
  checkInterval: number; // milliseconds
  distributionPercentages: {
    volume: number;      // Reindeer 1
    buyback: number;     // Reindeer 2
    airdrop: number;     // Reindeer 3
    treasury: number;    // Reindeer 4
  };
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
  volumeShare: number;     // Reindeer 1 - 25%
  buybackShare: number;    // Reindeer 2 - 25%
  airdropShare: number;    // Reindeer 3 - 25%
  treasuryShare: number;   // Reindeer 4 - 25%
  success: boolean;
  errors?: string[];
}

export class FeeCollector {
  private config: FeeCollectorConfig;
  private solanaService: SolanaService;
  private transactionService: TransactionService;
  private stats: FeeStats;
  private isRunning: boolean;
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    config: FeeCollectorConfig,
    solanaService: SolanaService,
    transactionService: TransactionService
  ) {
    // Initialize
  }

  // Core methods
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async checkAndClaimFees(): Promise<void>;
  private async getCreatorFeeBalance(): Promise<number>;
  private async claimFees(amount: number): Promise<string>;
  private async distributeFees(amount: number): Promise<void>;

  // Utility methods
  getStats(): FeeStats;
  async getLastClaimSignature(): Promise<string | null>;
}
```

PUMP.FUN INTEGRATION:

```typescript
// Bonding curve account structure (from pump.fun IDL)
interface BondingCurve {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
  creatorFeeBasis: number; // Usually 50 (0.05%)
  creatorFeeClaimed: BN;
  creatorFeeUnclaimed: BN; // THIS IS WHAT WE MONITOR
}

// How to query bonding curve
async function getBondingCurveData(
  connection: Connection,
  bondingCurveAddress: PublicKey
): Promise<BondingCurve> {
  const accountInfo = await connection.getAccountInfo(bondingCurveAddress);
  if (!accountInfo) throw new Error('Bonding curve not found');

  // Decode using pump.fun IDL
  // Return parsed data
}

// How to build claim instruction
async function buildClaimFeeInstruction(
  program: Program,
  bondingCurveAddress: PublicKey,
  creator: PublicKey
): Promise<TransactionInstruction> {
  // Use Anchor to build instruction
  const ix = await program.methods
    .claimFee()
    .accounts({
      bondingCurve: bondingCurveAddress,
      creator: creator,
      // ... other accounts
    })
    .instruction();

  return ix;
}
```

DISTRIBUTION LOGIC:

```typescript
async function distributeFees(totalAmount: number): Promise<void> {
  const { distributionPercentages } = this.config;

  // ❄️ Frostbyte distribution (25% each)
  const amounts = {
    volume: totalAmount * (distributionPercentages.volume / 100),      // Reindeer 1
    buyback: totalAmount * (distributionPercentages.buyback / 100),    // Reindeer 2
    airdrop: totalAmount * (distributionPercentages.airdrop / 100),    // Reindeer 3
    treasury: totalAmount * (distributionPercentages.treasury / 100),  // Reindeer 4
  };

  const record: DistributionRecord = {
    timestamp: new Date(),
    totalAmount,
    ...amounts,
    success: false,
    errors: [],
  };

  try {
    logger.info('❄️ Frostbyte distributing fees...', { totalAmount });

    // Reindeer 1: Volume Creation (fastest, can fail without affecting others)
    try {
      await this.volumeCreator.createVolume(amounts.volume);
      logger.info(`✅ Reindeer 1 (Volume): ${amounts.volume} SOL`);
    } catch (error) {
      record.errors!.push(`Reindeer 1: ${error.message}`);
      logger.error('Reindeer 1 (Volume) failed', { error });
    }

    // Reindeer 2: Buyback & Burn (critical, should not fail)
    await this.buybackBurner.buybackAndBurn(amounts.buyback);
    logger.info(`✅ Reindeer 2 (Buyback & Burn): ${amounts.buyback} SOL`);

    // Reindeer 3: Airdrops (can be expensive, might fail on large holder lists)
    try {
      await this.airdropDistributor.distribute(amounts.airdrop);
      logger.info(`✅ Reindeer 3 (Airdrops): ${amounts.airdrop} SOL`);
    } catch (error) {
      record.errors!.push(`Reindeer 3: ${error.message}`);
      logger.error('Reindeer 3 (Airdrops) failed', { error });
    }

    // Reindeer 4: Treasury (simple transfer, should always work)
    await this.sendToTreasury(amounts.treasury);
    logger.info(`✅ Reindeer 4 (Treasury): ${amounts.treasury} SOL`);

    record.success = record.errors!.length === 0;
    this.stats.distributionHistory.push(record);

    logger.info('🎅 Distribution complete!', {
      successful: 4 - record.errors!.length,
      failed: record.errors!.length,
    });

  } catch (error) {
    logger.error('Critical distribution error', { error });
    throw error;
  }
}
```

MONITORING LOOP:

```typescript
async function start(): Promise<void> {
  if (this.isRunning) {
    logger.warn('Fee collector already running');
    return;
  }

  logger.info('🚀 Fee collector starting...', {
    token: this.config.tokenAddress,
    checkInterval: this.config.checkInterval,
  });

  this.isRunning = true;

  // Main monitoring loop
  this.intervalHandle = setInterval(async () => {
    try {
      await this.checkAndClaimFees();
    } catch (error) {
      logger.error('Fee check cycle failed', { error });
      // Continue running despite errors
    }
  }, this.config.checkInterval);

  // Initial check
  await this.checkAndClaimFees();
}

async function checkAndClaimFees(): Promise<void> {
  const feeBalance = await this.getCreatorFeeBalance();

  logger.debug('Fee balance check', {
    balance: feeBalance,
    threshold: this.config.minimumClaimThreshold,
  });

  if (feeBalance >= this.config.minimumClaimThreshold) {
    logger.info('💰 Claiming fees', { amount: feeBalance });

    const signature = await this.claimFees(feeBalance);

    logger.info('✅ Fees claimed', { signature, amount: feeBalance });

    // Update stats
    this.stats.totalCollected += feeBalance;
    this.stats.lastClaimAmount = feeBalance;
    this.stats.lastClaimTime = new Date();
    this.stats.claimCount++;

    // Trigger distribution
    await this.distributeFees(feeBalance);
  }
}
```

ERROR HANDLING:
- RPC connection failures → log and retry
- Claim transaction failures → log and retry next cycle
- Distribution failures → log but don't halt (partial distribution ok)
- Invalid bonding curve data → alert and stop

LOGGING:
- Every fee check (debug level)
- Claim attempts and results (info level)
- Distribution breakdown (info level)
- Errors with full context (error level)
- Daily summary stats (info level)

VALIDATION:
- Bonding curve address is valid
- Creator wallet matches bonding curve creator
- Distribution percentages sum to 100
- Minimum claim threshold > 0
- Check interval reasonable (not too frequent)
```

---

## Success Criteria

- [ ] FeeCollector class fully implemented
- [ ] Can query bonding curve for fee balance
- [ ] Claim fee instruction builds correctly
- [ ] Distribution triggers all 5 modules
- [ ] Monitoring loop runs without crashes
- [ ] Stats tracking works
- [ ] Error handling prevents crashes
- [ ] Logs provide clear visibility
- [ ] Can start and stop gracefully

---

## Dependencies

This module depends on:
- ✅ Phase 1: SolanaService, TransactionService
- ⏳ Phase 3: VolumeCreator (can mock initially)
- ⏳ Phase 4: BuybackBurner (can mock initially)
- ⏳ Phase 5: AirdropDistributor (can mock initially)
- ⏳ Phase 6: LiquidityInjector (can mock initially)

**Strategy**: Build with mock implementations of other modules, replace later.

---

## Mock Implementations for Testing

```typescript
// Temporary mocks until other modules built
class MockVolumeCreator {
  async createVolume(amount: number): Promise<void> {
    logger.info(`[MOCK] Would create volume with ${amount} SOL`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

class MockBuybackBurner {
  async buybackAndBurn(amount: number): Promise<void> {
    logger.info(`[MOCK] Would buyback & burn with ${amount} SOL`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ... similar for other modules
```

---

## Testing Strategy

1. **Devnet Testing**:
   - Deploy a test token on pump.fun devnet (if available)
   - Generate some trading volume
   - Test fee accrual and claiming

2. **Mainnet Testing** (small amounts):
   - Use actual token with minimal fees
   - Test claim with tiny amounts first
   - Verify distribution percentages correct

---

## Required Constants

```typescript
// In src/config/constants.ts
export const PUMP_FUN_PROGRAM = new PublicKey(
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
);

export const BONDING_CURVE_SEED = 'bonding-curve';
```

---

## Next Phase

After implementing fee collection, proceed to:
👉 **Phase 3**: `03-volume-creator.md`

---

## Questions to Resolve

1. What's the minimum fee threshold to claim? (e.g., 0.01 SOL)
2. How often should fees be checked? (every 30 seconds? 1 minute?)
3. Should failed distributions be retried or just logged?
4. Where should the treasury SOL be sent?
