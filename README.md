# 🧠 Frostbyte AI

**AI-powered tokenomics management for pump.fun tokens on Solana**

Frostbyte combines automated fee collection with real-time Claude AI analysis to intelligently allocate creator fees across four parallel strategies. The AI continuously analyzes market conditions and adjusts capital allocation with full transparency via a "train of thought" interface.

---

## 🏗️ Architecture

```
PUMP.FUN TOKEN
      ↓
   🎅 Santa (Fee Collector)
      ↓
CLAUDE AI ANALYSIS ← Market Data (Price, Volume, Holders)
      ↓
Fee Allocation Decision
      ↓
   ┌─────────────────────────────────┐
   ├─→ 🦌 Volume Creator
   ├─→ 🔥 Buyback & Burn
   ├─→ 🪂 Airdrop Distributor
   └─→ 🏦 Treasury
```

### Core Modules

| Module | Role | AI-Driven |
|--------|------|-----------|
| **Santa** | Collects creator fees from pump.fun | — |
| **Volume Creator** | Creates organic trading activity | ✓ |
| **Buyback & Burn** | Deflation through token burns | ✓ |
| **Airdrop Distributor** | Rewards holders with SOL | ✓ |
| **Treasury** | Operational reserves | ✓ |

---

## 🧠 AI Decision Engine

The system uses Claude to analyze market snapshots and make dynamic allocation decisions:

### Market Analysis
Claude receives real-time data:
- **Price metrics** - Current price, 1h/24h/7d changes, highs/lows
- **Volume metrics** - 24h volume, buy/sell ratio, transaction count
- **Holder metrics** - Total holders, concentration (top 10/20%), changes
- **Bonding curve** - Progress to graduation, virtual reserves
- **Recent events** - Large buys/sells, whale movements, volume spikes

### Decision Output
Claude returns:
- **Allocation percentages** (volume/buyback/airdrop/treasury)
- **Reasoning** (market analysis, sentiment, strategy, risks)
- **Confidence score** (0-100%)
- **Priority level** (low/medium/high/urgent)
- **Next evaluation** timing (adaptive based on volatility)

### Market Sentiment Mapping
| Condition | AI Response |
|-----------|-------------|
| Price dumping | Increase buyback & burn |
| Price pumping | Increase airdrops to reward |
| Low volume | Increase volume creation |
| High volatility | Increase treasury reserves |
| Healthy growth | Balanced allocation |

---

## ✨ Features

- ✅ Automated fee collection from pump.fun bonding curve
- ✅ **Claude AI analysis of market conditions** (streaming thoughts in real-time)
- ✅ Dynamic fee allocation based on AI decisions
- ✅ Transparent "train of thought" display on dashboard
- ✅ Real-time market overview with price/volume/holder metrics
- ✅ Token buyback & permanent burn execution
- ✅ Proportional SOL airdrops to holders
- ✅ REST API for programmatic control
- ✅ WebSocket for real-time updates
- ✅ Dry-run mode for testing
- ✅ Health monitoring & graceful shutdown

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values (see Configuration section below)
```

### 3. Derive Bonding Curve Addresses

```bash
npm run derive-addresses
```

### 4. Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start

# Dry run (no real transactions)
DRY_RUN=true npm run dev
```

---

## 🔧 Configuration

### Required Variables

| Variable | Description |
|----------|-------------|
| `RPC_ENDPOINT` | Solana RPC URL (Helius, QuickNode, etc.) |
| `CREATOR_PRIVATE_KEY` | Your wallet private key (base58) |
| `TOKEN_ADDRESS` | Your pump.fun token mint address |
| `ANTHROPIC_API_KEY` | Claude API key from https://console.anthropic.com |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BONDING_CURVE_ADDRESS` | Auto-derived with `npm run derive-addresses` | — |
| `BIRDEYE_API_KEY` | For enhanced market analytics | (optional) |
| `AI_ENABLED` | Toggle AI decision engine on/off | `true` |
| `AI_MIN_DECISION_INTERVAL` | Min milliseconds between AI calls | `60000` |
| `API_KEY` | API authentication key | Required |
| `TELEGRAM_BOT_TOKEN` | For notifications | (optional) |
| `DRY_RUN` | Testing mode (no real transactions) | `false` |

---

## 📡 API Endpoints

All endpoints except `/health` require `X-API-Key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Bot status & uptime |
| `/stats` | GET | Comprehensive statistics |
| `/wallets` | GET | Live wallet balances |
| `/wallets/fees` | GET | Available creator fees |
| `/stats/burns` | GET | Burn history |
| `/stats/airdrops` | GET | Airdrop records |
| `/control/pause` | POST | Pause bot operations |
| `/control/resume` | POST | Resume bot operations |

### WebSocket Events

Connect to `ws://your-server:3000` for real-time updates:

```
fee_collected     - Fees claimed from bonding curve
ai_thought        - AI streaming thought chunks
ai_decision       - Final AI decision with allocation
burn              - Tokens burned
airdrop           - Airdrops sent
volume            - Volume trades executed
market_data       - Current market snapshot
```

---

## 📊 Dashboard

The dashboard displays real-time data with two main views:

### AI Brain
- Real-time streaming of Claude's analysis
- Sections: Market Analysis → Sentiment → Strategy → Risks → Decision
- Final allocation visualization with confidence score
- Priority level and sentiment indicators

### Market Overview
- Current price with 1h/24h/7d changes
- 24h volume and buy/sell ratio
- Holder distribution and concentration
- Bonding curve progress

---

## 🌐 Deployment

### Deploy to Render.com

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Background Worker
3. Connect your repository
4. Add environment variables as **Secrets**:
   - `RPC_ENDPOINT`
   - `CREATOR_PRIVATE_KEY`
   - `TOKEN_ADDRESS`
   - `API_KEY`
   - `ANTHROPIC_API_KEY`
   - `BIRDEYE_API_KEY` (optional)

5. Deploy

The `render.yaml` file is pre-configured.

---

## 📁 Project Structure

```
src/
├── main.ts              # Entry point & orchestrator
├── config/              # Environment & constants
├── services/            # Solana & transaction services
├── ai/                  # AI decision engine
│   ├── types.ts         # Type definitions
│   ├── marketDataCollector.ts  # Market snapshot gathering
│   ├── claudeClient.ts  # Claude API integration
│   ├── decisionEngine.ts      # Allocation decisions
│   └── index.ts         # AI module exports
├── modules/
│   ├── feeCollector.ts      # 🎅 Santa
│   ├── volumeCreator.ts     # 🦌 Reindeer 1
│   ├── buybackBurn.ts       # 🦌 Reindeer 2
│   └── airdropDistributor.ts # 🦌 Reindeer 3
├── api/
│   ├── server.ts        # Express + WebSocket
│   ├── routes/          # API endpoints
│   └── websocket/       # Real-time events
└── utils/               # Logger & helpers

dashboard/              # Next.js frontend
├── app/
├── components/
│   ├── AIBrain.tsx     # AI thought streaming
│   ├── MarketOverview.tsx
│   └── ...
└── lib/
```

---

## 🔒 Security

- ⚠️ **Never commit private keys** - use `.env` and Render secrets
- 🧪 Test with `DRY_RUN=true` first
- 🛑 Use `/control/pause` for emergencies
- 📊 Monitor logs regularly
- 🔑 Keep API keys secure (Anthropic, RPC, etc.)

---

## 🛠️ Development

### Build & Test

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Run in development
npm run test-connection  # Test Solana RPC
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Dashboard Development

```bash
cd dashboard
npm run dev
# Opens at http://localhost:3000
```

---

## 📜 License

MIT

---

**Built for the pump.fun community with AI-powered intelligence** 🧠 ❄️
