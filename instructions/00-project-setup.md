# Phase 0: Project Setup

## Objective
Initialize a production-ready Node.js/TypeScript project with proper structure, dependencies, and configuration for the Solana tokenomics bot.

---

## Prompt for Claude

```
Create a new Node.js/TypeScript project for a Solana tokenomics bot with the following specifications:

PROJECT STRUCTURE:
```
tokenomics-bot/
├── src/
│   ├── main.ts                    # Entry point
│   ├── config/
│   │   ├── constants.ts           # Blockchain constants (program IDs, etc.)
│   │   └── env.ts                 # Environment variable validation
│   ├── modules/
│   │   ├── feeCollector.ts        # Phase 2
│   │   ├── volumeCreator.ts       # Phase 3
│   │   ├── buybackBurn.ts         # Phase 4
│   │   ├── airdropDistributor.ts  # Phase 5
│   │   └── liquidityInjector.ts   # Phase 6
│   ├── services/
│   │   ├── solanaService.ts       # Solana connection & utilities
│   │   └── transactionService.ts  # Transaction building & sending
│   ├── utils/
│   │   ├── logger.ts              # Logging utility
│   │   ├── retry.ts               # Retry logic
│   │   └── validation.ts          # Input validation
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── tests/
│   └── (test files mirror src structure)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── .prettierrc
```

DEPENDENCIES TO INSTALL:
- @solana/web3.js (latest)
- @solana/spl-token (latest)
- @coral-xyz/anchor (latest)
- bs58 (for base58 encoding)
- dotenv (environment variables)
- winston (logging)
- typescript
- ts-node
- @types/node
- prettier
- eslint

ENVIRONMENT VARIABLES (.env.example):
- RPC_ENDPOINT (Solana RPC URL)
- RPC_WEBSOCKET_ENDPOINT (WebSocket URL)
- CREATOR_PRIVATE_KEY (main wallet)
- VOLUME_WALLET_KEYS (comma-separated private keys for volume)
- BURN_WALLET_PRIVATE_KEY (wallet for burned tokens)
- TOKEN_ADDRESS (your pump.fun token)
- MIN_HOLDER_THRESHOLD (minimum tokens to qualify for airdrops)
- POOL_ADDRESS (PumpSwap/Raydium pool - optional initially)
- LOG_LEVEL (debug/info/warn/error)
- DISTRIBUTION_PERCENTAGES (20,20,20,20,20 - for 5-way split)

TYPESCRIPT CONFIG:
- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Source maps enabled
- Output directory: dist/

SCRIPTS (package.json):
- "start": "node dist/main.js"
- "dev": "ts-node src/main.ts"
- "build": "tsc"
- "test": "jest"
- "lint": "eslint src/**/*.ts"
- "format": "prettier --write src/**/*.ts"

REQUIREMENTS:
1. Create all folders and placeholder files
2. Configure TypeScript with strict settings
3. Set up ESLint and Prettier for code quality
4. Create comprehensive .gitignore (include node_modules, .env, dist/)
5. Add helpful comments in each placeholder file explaining its future purpose
6. Create a basic logger utility in utils/logger.ts using winston
7. Validate environment variables in config/env.ts with clear error messages
8. Add Solana program constants in config/constants.ts:
   - PUMP_FUN_PROGRAM
   - TOKEN_PROGRAM_ID
   - ASSOCIATED_TOKEN_PROGRAM
   - SYSTEM_PROGRAM_ID

VALIDATION:
After completion, verify:
- npm install runs without errors
- TypeScript compiles successfully (npm run build)
- Environment validation works (handles missing vars gracefully)
- Logger can output to console and file
- Project structure matches specification exactly
```

---

## Success Criteria

- [ ] Project initializes with `npm install`
- [ ] TypeScript compiles with `npm run build`
- [ ] All directories and placeholder files created
- [ ] Environment validation throws clear errors for missing variables
- [ ] Logger utility works (test with simple log statement)
- [ ] .gitignore properly excludes sensitive files
- [ ] README.md explains project purpose and setup

---

## Files to Create

### 1. `package.json`
- All required dependencies
- Proper scripts configuration
- Project metadata

### 2. `tsconfig.json`
- Strict TypeScript settings
- Proper module resolution
- Source map support

### 3. `.env.example`
- All required environment variables
- Helpful comments for each variable
- Example values (non-sensitive)

### 4. `.gitignore`
- node_modules/
- dist/
- .env
- *.log
- .DS_Store

### 5. `src/config/constants.ts`
- Solana program IDs
- Platform-specific constants
- Network configurations

### 6. `src/config/env.ts`
- Environment variable loading
- Validation logic
- Type-safe config export

### 7. `src/utils/logger.ts`
- Winston configuration
- Console and file transports
- Log levels and formatting

### 8. `README.md`
- Project description
- Setup instructions
- Environment variable documentation
- Development commands

---

## Expected Output Structure

```typescript
// Example: src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  rpcEndpoint: string;
  rpcWebsocketEndpoint: string;
  creatorPrivateKey: string;
  tokenAddress: string;
  logLevel: string;
  // ... more config
}

function validateEnv(): Config {
  const required = [
    'RPC_ENDPOINT',
    'CREATOR_PRIVATE_KEY',
    'TOKEN_ADDRESS'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    rpcEndpoint: process.env.RPC_ENDPOINT!,
    // ... map all variables
  };
}

export const config = validateEnv();
```

---

## Questions to Clarify Before Implementation

1. Should the bot support multiple tokens simultaneously, or focus on one token at a time?
2. Do you want a CLI interface for management, or purely automated?
3. Should there be a web dashboard for monitoring (separate project)?
4. What's the preferred log retention policy (daily rotation, size-based)?

---

## Next Phase

After completing this setup, proceed to:
👉 **Phase 1**: `01-solana-connection.md`
