# ❄️ Frostbyte System

## Overview

Frostbyte is an automated tokenomics bot that uses the metaphor of Santa Claus and his Reindeer, where each component has a specific role in managing and distributing creator fees.

---

## System Architecture

```
                          🎅 SANTA
                    (Fee Collector)
                          |
          Monitors & Claims Creator Fees
                          |
                          ↓
        ┌─────────────────┼─────────────────┐
        |                 |                 |
        ↓                 ↓                 ↓
     25% SOL          25% SOL          25% SOL          25% SOL
        |                 |                 |                |
        ↓                 ↓                 ↓                ↓
    🦌 REINDEER 1    🦌 REINDEER 2    🦌 REINDEER 3    🦌 REINDEER 4
  Volume Creator   Buyback & Burn   Airdrop Dist.    Treasury Mgr

  - Multi-wallet   - Market buy      - Holder query   - Safe storage
  - Random timing  - Token burn      - Proportional   - Operations
  - Organic looks  - Deflationary    - Rewards        - Reserve funds
```

---

## The Team

### 🎅 **Santa** (Fee Collector)
**Role:** Chief Orchestrator and Fee Manager

**Responsibilities:**
- Monitor pump.fun bonding curve for creator fees (0.05% of volume)
- Automatically claim accumulated fees when threshold reached
- Distribute claimed fees equally to the Frostbyte modules (25% each)
- Track all fee collection and distribution history
- Trigger WebSocket events for real-time updates
- Generate daily reports

**Files:**
- `src/modules/feeCollector.ts`

---

### 🦌 **Reindeer 1** (Volume Creator)
**Role:** Trading Volume Generator

**What it does:**
- Receives 25% of claimed fees
- Executes strategic buy transactions on pump.fun
- Uses multiple wallets for organic appearance
- Randomizes trade sizes and timing
- Creates healthy trading volume
- Supports token visibility and price discovery

**Key Features:**
- 3-8 random wallets
- Trade sizes: 0.001-0.05 SOL
- Delays: 5-30 seconds between trades
- 3% slippage tolerance
- Success tracking

**Files:**
- `src/modules/volumeCreator.ts`

---

### 🦌 **Reindeer 2** (Buyback & Burn)
**Role:** Deflationary Mechanism

**What it does:**
- Receives 25% of claimed fees
- Buys tokens from pump.fun bonding curve
- Permanently burns purchased tokens
- Reduces circulating supply
- Logs all burn events for transparency

**Key Features:**
- SPL token burn (reduces total supply)
- Transparent burn tracking
- Burn percentage calculation
- Public burn records

**Files:**
- `src/modules/buybackBurn.ts`

---

### 🦌 **Reindeer 3** (Airdrop Distributor)
**Role:** Holder Rewards System

**What it does:**
- Receives 25% of claimed fees
- Queries all token holders on-chain
- Filters by minimum holding threshold
- Distributes SOL proportionally
- Batch transfers for efficiency

**Key Features:**
- Minimum holding: 1M tokens (configurable)
- Proportional distribution
- Excludes burn wallets
- Max 100 recipients per run (configurable)
- Minimum 0.001 SOL per holder

**Files:**
- `src/modules/airdropDistributor.ts`

---

### 🦌 **Reindeer 4** (Treasury Manager)
**Role:** Operations and Reserve Fund

**What it does:**
- Receives 25% of claimed fees
- Simple SOL transfer to treasury wallet
- Funds operational costs
- Emergency reserves
- Future development budget

**Key Features:**
- Direct SOL transfer
- Trackable amounts
- Secure destination wallet
- Transparent accounting

**Files:**
- Handled within `src/modules/feeCollector.ts` (simple transfer)

---

## Distribution Flow

```
1. Trading Volume Generated
   ↓
2. Creator Fees Accumulate (0.05% of volume)
   ↓
3. 🎅 Santa Monitors Fees
   ↓
4. Threshold Reached (e.g., 0.01 SOL)
   ↓
5. 🎅 Santa Claims Fees
   ↓
6. Distribution Triggered:
   - 25% → 🦌 Reindeer 1 (Volume)
   - 25% → 🦌 Reindeer 2 (Buyback & Burn)
   - 25% → 🦌 Reindeer 3 (Airdrops)
   - 25% → 🦌 Reindeer 4 (Treasury)
   ↓
7. Each Reindeer Executes Their Task
   ↓
8. Results Logged & Broadcast (WebSocket + Telegram)
   ↓
9. Repeat
```

---

## Backend API & Data Layer

In addition to the core Frostbyte system, there's a **Backend API** that provides:

### REST API Endpoints
- `GET /stats` - Comprehensive statistics
- `GET /stats/fees` - Fee collection history
- `GET /stats/volume` - Volume metrics (Reindeer 1)
- `GET /stats/burns` - Burn history (Reindeer 2)
- `GET /stats/airdrops` - Airdrop records (Reindeer 3)
- `GET /health` - System health check
- `POST /control/pause` - Emergency pause

### WebSocket Events (Real-time)
- Fee collection events
- Burn notifications
- Airdrop completions
- Volume creation updates
- Error alerts

### Telegram Bot Integration
**Commands:**
- `/stats` - View comprehensive report
- `/burns` - View burn statistics
- `/airdrops` - View airdrop data
- `/volume` - View volume metrics
- `/help` - Show all commands

**Automatic Notifications:**
- Fee collected alert
- Burn completion with amount
- Airdrop distribution complete
- Error notifications

**Files:**
- `src/api/server.ts`
- `src/api/routes/`
- `src/api/services/telegramService.ts`
- `src/api/websocket/events.ts`

---

## Key Benefits

### For Token Holders
- ✅ **Regular Airdrops** - Get SOL just for holding
- ✅ **Deflationary Pressure** - Token supply reduces over time
- ✅ **Active Trading** - Volume creation supports liquidity
- ✅ **Transparency** - All operations logged and public

### For Token Creator
- ✅ **Automated Operations** - Set it and forget it
- ✅ **Sustainable Growth** - Balanced tokenomics
- ✅ **Community Rewards** - Holders get value back
- ✅ **Professional Image** - Shows commitment to project

### For The Ecosystem
- ✅ **Natural Volume** - Organic-looking trades
- ✅ **Price Support** - Buybacks create demand
- ✅ **Holder Loyalty** - Airdrops incentivize holding
- ✅ **Long-term Viability** - Treasury funds future development

---

## Configuration

### Distribution (Default)
```typescript
{
  volume: 25,    // Reindeer 1
  buyback: 25,   // Reindeer 2
  airdrop: 25,   // Reindeer 3
  treasury: 25   // Reindeer 4
}
```

**Note:** Percentages can be adjusted, but must total 100%

### Fee Claiming
- **Minimum Threshold:** 0.01 SOL (configurable)
- **Check Interval:** 30 seconds (configurable)

### Volume Creation
- **Trade Size:** 0.001 - 0.05 SOL
- **Number of Wallets:** 5-10 recommended
- **Delay Between Trades:** 5-30 seconds random
- **Slippage:** 3% default

### Buyback & Burn
- **Method:** SPL Token Burn (reduces total supply)
- **Slippage:** 3% default
- **Max per Transaction:** 10% of supply

### Airdrops
- **Minimum Holding:** 1M tokens (configurable)
- **Minimum Airdrop:** 0.001 SOL
- **Max Recipients:** 100 per run
- **Distribution:** Proportional to holdings

---

## Monitoring & Transparency

### Daily Reports
Generated automatically at midnight:
- Total fees collected
- Volume created by Reindeer 1
- Tokens burned by Reindeer 2
- SOL distributed by Reindeer 3
- Treasury balance (Reindeer 4)

### Real-time Updates
Via WebSocket and Telegram:
- Fee claims
- Distribution events
- Burns
- Airdrops
- Errors

### Public Data
Export formats:
- JSON API for frontend dashboards
- CSV for spreadsheets
- Transaction signatures for verification

---

## Security Features

- ✅ **Private Keys** - Never logged, stored in env variables only
- ✅ **Rate Limiting** - API protection
- ✅ **Authentication** - API key required
- ✅ **Error Recovery** - Individual module failures don't crash system
- ✅ **Emergency Stop** - Can pause all operations
- ✅ **Dry-Run Mode** - Test without real transactions

---

## Comparison to Original Plan

| Feature | Original (5-way) | New (Frostbyte) |
|---------|-----------------|------------------|
| Distribution | 20% each (5 ways) | 25% each (4 ways) |
| Volume Creation | ✅ | ✅ |
| Buyback & Burn | ✅ | ✅ |
| Holder Airdrops | ✅ | ✅ |
| Liquidity Injection | ✅ | ❌ Removed |
| Treasury | ✅ | ✅ Enhanced |
| Backend API | ❌ | ✅ New |
| Telegram Bot | ❌ | ✅ New |
| WebSocket Events | ❌ | ✅ New |

**Rationale for Changes:**
- **Removed Liquidity Injection:** Simplified system, most tokens don't graduate quickly
- **Increased Treasury:** From 20% to 25%, provides more operational funds
- **Added Backend:** Essential for Telegram bot and frontend integration
- **Cleaner Distribution:** 4-way split is simpler and more balanced

---

## Technical Stack

- **Language:** TypeScript/Node.js
- **Blockchain:** Solana
- **Platform:** pump.fun
- **API Framework:** Express.js
- **WebSocket:** ws library
- **Telegram:** node-telegram-bot-api
- **Deployment:** Render.com
- **RPC:** Helius/QuickNode/Chainstack

---

## Cost Estimate

**Monthly:**
- Render.com: $7-25
- RPC Provider: $50-200
- Transaction Fees: $5-20
- **Total: $60-250/month**

---

## Build Order

1. Project Setup (Phase 0)
2. Solana Connection (Phase 1)
3. 🎅 Santa - Fee Collector (Phase 2)
4. 🦌 Reindeer 1 - Volume Creator (Phase 3)
5. 🦌 Reindeer 2 - Buyback & Burn (Phase 4)
6. 🦌 Reindeer 3 - Airdrop Distributor (Phase 5)
7. Backend API + Telegram Bot (Phase 6)
8. Main Orchestration (Phase 7)
9. Testing & Deployment (Phase 8)

**Total Time:** 6-7 hours

---

## Success Metrics

Track these KPIs:
- Total fees collected
- Volume generated
- Tokens burned (% of supply)
- SOL distributed to holders
- Number of unique airdrop recipients
- Average holder reward
- Treasury balance
- System uptime

---

**Frostbyte creates a sustainable, transparent, and community-focused tokenomics engine that runs 24/7 on autopilot!** ❄️
