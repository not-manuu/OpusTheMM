# AGENTS.md - Coding Guidelines

## Build & Commands

- **`npm install`** - Install dependencies
- **`npm run build`** - Compile TypeScript to JavaScript (`tsc`)
- **`npm run dev`** - Run in development mode (ts-node)
- **`npm start`** - Run compiled JavaScript
- **`npm run lint`** - Run ESLint on TypeScript files
- **`npm run format`** - Format code with Prettier
- **`npm run test-connection`** - Test Solana RPC connectivity
- **`npm run derive-addresses`** - Derive bonding curve addresses from token mint

## Architecture

**Project**: Santa's Tokenomics Bot - Automated tokenomics for pump.fun tokens on Solana

**Structure**:
- `src/config/` - Environment validation, constants
- `src/services/` - Solana/transaction services
- `src/modules/` - Fee collector, volume creator, buyback/burn, airdrop modules
- `src/api/` - REST API and WebSocket server
- `src/utils/` - Winston logger, helpers
- `src/types/` - TypeScript interfaces

**Key Dependencies**: @solana/web3.js, @coral-xyz/anchor, express, ws, winston, dotenv

**Stack**: TypeScript, Node.js 18+, Solana blockchain (mainnet)

## Code Style & Conventions

- **Language**: TypeScript (strict mode enabled)
- **Format**: ES2022 target, CommonJS modules
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces, UPPER_CASE for constants
- **Imports**: Use relative paths (`../`) in src/, organize by category (external, internal)
- **Types**: Strict types required; no `any` unless unavoidable
- **Error Handling**: Throw errors with descriptive messages, use logger for warnings/info
- **Comments**: JSDoc-style headers for files/functions, brief inline comments
- **Logging**: Use Winston logger via `logger.info()`, `logger.error()`, etc.
- **File naming**: camelCase.ts (e.g., solanaService.ts)
- **Modules**: One export per file when possible; use index.ts for re-exports
