# 🧠 OpusMM

**Claude AI-powered tokenomics management for pump.fun tokens on Solana**

OpusMM combines automated fee collection with real-time **Claude AI** analysis to intelligently allocate creator fees across four parallel strategies. The system continuously streams Claude's reasoning in real-time, giving you complete transparency into every allocation decision through a "train of thought" interface.

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

## 🧠 Claude AI Decision Engine

**OpusMM is powered by Anthropic's Claude 3.5 Sonnet**, a state-of-the-art AI model that analyzes market snapshots in real-time and makes dynamic allocation decisions. The entire decision process is streamed to your dashboard, showing you exactly what Claude is thinking.

### Market Analysis via Claude
Claude receives real-time market data via the Anthropic API:
- **Price metrics** - Current price, 1h/24h/7d changes, highs/lows
- **Volume metrics** - 24h volume, buy/sell ratio, transaction count
- **Holder metrics** - Total holders, concentration (top 10/20%), changes
- **Bonding curve** - Progress to graduation, virtual reserves
- **Recent events** - Large buys/sells, whale movements, volume spikes

### Claude's Decision Output
Using Anthropic's Claude API, the model returns:
- **Allocation percentages** (volume/buyback/airdrop/treasury) - optimized for market conditions
- **Streaming reasoning** (market analysis → sentiment → strategy → risks → decision)
- **Confidence score** (0-100%) - Claude's certainty in the decision
- **Priority level** (low/medium/high/urgent) - action urgency
- **Next evaluation** timing - adaptive based on volatility and market momentum

**All Claude API calls are made via `@anthropic-ai/sdk`** for secure, direct integration with Anthropic's infrastructure.

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
- ✅ **Claude 3.5 Sonnet AI analysis** - real-time market reasoning via Anthropic API
- ✅ **Streaming AI thoughts** - watch Claude think through each decision in real-time
- ✅ Dynamic fee allocation powered by Claude's market analysis
- ✅ **Transparent "train of thought" dashboard** - see Claude's full reasoning
- ✅ Real-time market overview with price/volume/holder metrics
- ✅ Token buyback & permanent burn execution
- ✅ Proportional SOL airdrops to holders
- ✅ REST API for programmatic control
- ✅ WebSocket for real-time updates (AI thoughts, market data, events)
- ✅ Dry-run mode for testing Claude decisions without real transactions
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
| `ANTHROPIC_API_KEY` | **Claude API key** from https://console.anthropic.com (required for AI) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BONDING_CURVE_ADDRESS` | Auto-derived with `npm run derive-addresses` | — |
| `BIRDEYE_API_KEY` | For enhanced market analytics (Claude uses this data) | (optional) |
| `AI_ENABLED` | Toggle Claude AI decision engine on/off | `true` |
| `AI_MIN_DECISION_INTERVAL` | Min milliseconds between Claude AI calls | `60000` |
| `API_KEY` | API authentication key | Required |
| `TELEGRAM_BOT_TOKEN` | For notifications | (optional) |
| `DRY_RUN` | Testing mode (Claude makes decisions, but no real transactions) | `false` |

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

Connect to `ws://your-server:3000` for real-time Claude AI updates:

```
fee_collected     - Fees claimed from bonding curve
ai_thought        - Claude streaming thought chunks (market analysis → decision)
ai_decision       - Claude's final allocation decision with confidence score
burn              - Tokens burned (executed by Claude's decision)
airdrop           - Airdrops sent (executed by Claude's decision)
volume            - Volume trades executed (executed by Claude's decision)
market_data       - Current market snapshot (fed to Claude for analysis)
```

---

## 📊 Dashboard - Powered by Claude AI

The dashboard displays real-time data with Claude AI integration:

### 🧠 AI Brain Component
Watch Claude think in real-time:
- **Streaming thought sections**: Market Analysis → Sentiment → Strategy → Risks → Decision
- **Live text streaming** from Claude API as it analyzes market data
- **Final allocation visualization** with Claude's confidence score (0-100%)
- **Sentiment badge** (Bullish/Bearish/Neutral/Volatile) from Claude's analysis
- **Priority level indicator** (Low/Medium/High/Urgent)
- **Next evaluation countdown** based on Claude's adaptive timing

### 📈 Market Overview
Real-time market data fed to Claude:
- Current price with 1h/24h/7d changes
- 24h volume and buy/sell ratio (influences Claude's decisions)
- Holder distribution and concentration
- Bonding curve progress to graduation

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
├── ai/                  # Claude AI Decision Engine
│   ├── types.ts         # Type definitions (MarketSnapshot, AIDecision, etc.)
│   ├── marketDataCollector.ts  # Gathers market data for Claude analysis
│   ├── claudeClient.ts  # Anthropic Claude API integration & streaming
│   ├── decisionEngine.ts      # Processes Claude's allocation decisions
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
npm install          # Install dependencies (including @anthropic-ai/sdk)
npm run build        # Compile TypeScript
npm run dev          # Run in development (Claude AI enabled)
npm run test-connection  # Test Solana RPC
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Claude AI Testing

```bash
# Test Claude integration without real transactions
DRY_RUN=true npm run dev

# Toggle AI on/off in .env
AI_ENABLED=true   # Full Claude-powered operation
AI_ENABLED=false  # Bot runs with default 25/25/25/25 allocation
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

## 🛠️ Tech Stack

**AI & Decision Making:**
- `@anthropic-ai/sdk` - Claude 3.5 Sonnet API integration
- Streaming responses for real-time thought visualization

**Blockchain:**
- `@solana/web3.js` - Solana blockchain interaction
- `@coral-xyz/anchor` - Anchor framework for on-chain programs

**Backend:**
- TypeScript (strict mode)
- Node.js 18+
- Express.js for REST API
- WebSocket for real-time updates
- Winston for logging

**Frontend:**
- Next.js
- React + Tailwind CSS
- WebSocket client for live updates

---

**OpusMM: Claude AI meets pump.fun tokenomics** 🧠 🎯
