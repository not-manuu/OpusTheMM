# Phase 1: Solana Connection & Core Services

## Objective
Build robust Solana blockchain connection infrastructure with wallet management, transaction utilities, and error handling for reliable bot operation.

---

## Prompt for Claude

```
Implement the core Solana infrastructure for the tokenomics bot with production-ready error handling and utilities.

BUILD: src/services/solanaService.ts

REQUIREMENTS:
1. Solana RPC Connection Management
   - Create Connection instance with RPC endpoint
   - Configure commitment level (confirmed/finalized)
   - Implement connection health checks
   - Add automatic reconnection logic
   - Support WebSocket subscriptions

2. Wallet Management
   - Load wallet from private key (base58)
   - Support multiple wallet loading (for volume creation)
   - Secure keypair handling
   - Public key utilities

3. Account Utilities
   - Get SOL balance
   - Get token account balance
   - Find associated token accounts
   - Get token account info

4. Transaction Helpers
   - Build basic transactions
   - Add priority fees (dynamic calculation)
   - Sign transactions
   - Send and confirm transactions
   - Implement retry logic for failed transactions

5. Error Handling
   - Custom error types (NetworkError, TransactionError, etc.)
   - Retry mechanism with exponential backoff
   - Circuit breaker pattern for RPC failures
   - Detailed error logging

IMPLEMENTATION DETAILS:

class SolanaService:
  Methods needed:
  - constructor(rpcEndpoint: string, wsEndpoint: string)
  - async getConnection(): Connection
  - async checkConnectionHealth(): Promise<boolean>
  - loadWallet(privateKey: string): Keypair
  - loadMultipleWallets(keys: string[]): Keypair[]
  - async getSolBalance(publicKey: PublicKey): Promise<number>
  - async getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<number>
  - async findAssociatedTokenAccount(owner: PublicKey, mint: PublicKey): Promise<PublicKey>
  - async getRecentBlockhash(): Promise<string>
  - calculatePriorityFee(recentFees: number[]): number

class TransactionService:
  Methods needed:
  - async sendTransaction(transaction: Transaction, signers: Keypair[]): Promise<string>
  - async confirmTransaction(signature: string, maxRetries: number): Promise<boolean>
  - async sendAndConfirm(transaction: Transaction, signers: Keypair[]): Promise<string>
  - async buildTransaction(instructions: TransactionInstruction[], payer: PublicKey): Promise<Transaction>
  - async simulateTransaction(transaction: Transaction): Promise<SimulationResult>

ERROR HANDLING:
```typescript
// Custom error types
export class SolanaServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SolanaServiceError';
  }
}

export class TransactionError extends SolanaServiceError {
  constructor(message: string, public signature?: string) {
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
```

RETRY LOGIC:
```typescript
// Exponential backoff for retries
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

PRIORITY FEE CALCULATION:
```typescript
// Dynamic priority fee based on network congestion
async function calculateOptimalPriorityFee(connection: Connection): Promise<number> {
  const recentFees = await connection.getRecentPrioritizationFees();

  // Calculate 75th percentile for competitive fee
  const sorted = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
  const percentile75 = sorted[Math.floor(sorted.length * 0.75)];

  // Minimum 1000 micro-lamports, maximum 100000
  return Math.max(1000, Math.min(100000, percentile75));
}
```

VALIDATION REQUIREMENTS:
- All public keys validated before use
- Private keys never logged
- Connection health checked before critical operations
- Transactions simulated before sending (when possible)
- All errors caught and logged with context

TESTING REQUIREMENTS:
Create basic tests:
- Connection initialization
- Wallet loading (use test keypair)
- Balance fetching
- Transaction building
- Error handling scenarios
```

---

## Success Criteria

- [ ] SolanaService class implemented with all methods
- [ ] TransactionService class implemented with retry logic
- [ ] Connection health check works
- [ ] Can load wallet from private key
- [ ] Can fetch SOL and token balances
- [ ] Priority fee calculation implemented
- [ ] Custom error types created
- [ ] Retry mechanism with exponential backoff works
- [ ] All methods have proper TypeScript types
- [ ] Code compiles without errors

---

## Code Structure

```typescript
// src/services/solanaService.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';
import { logger } from '../utils/logger';

export class SolanaService {
  private connection: Connection;
  private wsConnection: Connection;

  constructor(rpcEndpoint: string, wsEndpoint: string) {
    this.connection = new Connection(rpcEndpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    this.wsConnection = new Connection(wsEndpoint, 'confirmed');

    logger.info('Solana service initialized', { rpcEndpoint });
  }

  // ... implement all methods
}
```

```typescript
// src/services/transactionService.ts
import { Transaction, TransactionInstruction, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaService } from './solanaService';
import { logger } from '../utils/logger';

export class TransactionService {
  constructor(private solanaService: SolanaService) {}

  // ... implement all methods
}
```

---

## Key Imports Needed

```typescript
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  SendOptions,
  ConfirmOptions,
} from '@solana/web3.js';

import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import bs58 from 'bs58';
```

---

## Testing Strategy

Create `tests/services/solanaService.test.ts`:

```typescript
describe('SolanaService', () => {
  it('should initialize connection', async () => {
    // Test connection initialization
  });

  it('should load wallet from private key', () => {
    // Test wallet loading
  });

  it('should get SOL balance', async () => {
    // Test balance fetching (use devnet)
  });

  it('should calculate priority fee', async () => {
    // Test fee calculation
  });

  it('should handle connection errors gracefully', async () => {
    // Test error handling
  });
});
```

---

## Common Pitfalls to Avoid

1. **Not handling RPC rate limits** - implement retry logic
2. **Using wrong commitment level** - 'confirmed' is good balance
3. **Not validating public keys** - always validate before use
4. **Logging private keys** - never log sensitive data
5. **Ignoring transaction simulation** - simulate before sending
6. **Not handling network errors** - RPC can be unreliable

---

## Environment Variables Used

```env
RPC_ENDPOINT=https://your-rpc-provider.com
RPC_WEBSOCKET_ENDPOINT=wss://your-rpc-provider.com
CREATOR_PRIVATE_KEY=your_base58_private_key
```

---

## Next Phase

After implementing and testing this infrastructure, proceed to:
👉 **Phase 2**: `02-fee-collector.md`

---

## Questions to Resolve

1. Which RPC provider are you using? (Helius, QuickNode, Chainstack, etc.)
2. Should transactions be sent with 'skipPreflight: true' for speed?
3. What's the acceptable transaction confirmation timeout?
4. Should failed transactions be logged to a separate error log file?
