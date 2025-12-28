# ❄️ Frostbyte

**Automated tokenomics management for pump.fun tokens on Solana**

Frostbyte creates a sustainable, automated tokenomics system that collects creator fees and distributes them across four parallel strategies powered by Santa and his Reindeer.

---

## 🦌 The Frostbyte System

| Module | Role | Share |
|--------|------|-------|
| 🎅 **Santa** | Collects creator fees from pump.fun | - |
| ❄️ **Reindeer 1** | Volume Creation - organic trading | 25% |
| 🔥 **Reindeer 2** | Buyback & Burn - deflationary | 25% |
| 🪂 **Reindeer 3** | Holder Airdrops - rewards | 25% |
| 🏦 **Reindeer 4** | Treasury - operations | 25% |

---

## ✨ Features

- ✅ Automated fee collection from pump.fun bonding curve
- ✅ Transparent single-wallet volume creation
- ✅ Token buyback & permanent burn
- ✅ Proportional SOL airdrops to holders
- ✅ REST API for dashboard integration
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
# Edit .env with your values
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

Copy `.env.example` to `.env` and fill in:

### Required
| Variable | Description |
|----------|-------------|
| `RPC_ENDPOINT` | Solana RPC URL (Helius, QuickNode) |
| `CREATOR_PRIVATE_KEY` | Your wallet private key (base58) |
| `TOKEN_ADDRESS` | Your pump.fun token mint |

### Optional
| Variable | Description |
|----------|-------------|
| `BONDING_CURVE_ADDRESS` | Auto-derived with `npm run derive-addresses` |
| `TELEGRAM_BOT_TOKEN` | For notifications |
| `DRY_RUN` | Set `true` for testing |

---

## 📡 API Endpoints

All endpoints except `/health` require `X-API-Key` header.

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Bot status & uptime |
| `GET /stats` | Comprehensive statistics |
| `GET /wallets` | Live wallet balances (for dashboard) |
| `GET /wallets/fees` | Available creator fees |
| `GET /stats/burns` | Burn history |
| `GET /stats/airdrops` | Airdrop records |
| `POST /control/pause` | Pause bot |
| `POST /control/resume` | Resume bot |

### WebSocket

Connect to `ws://your-server:3000` for real-time events:
- `fee_collected` - Fees claimed
- `burn` - Tokens burned
- `airdrop` - Airdrops sent
- `volume` - Volume trades executed

---

## 🌐 Deployment

### Deploy to Render.com

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Background Worker
3. Connect your repository
4. Add environment variables in dashboard
5. Deploy!

The `render.yaml` file is pre-configured.

### Environment Variables on Render

Add these as "Secret" in Render dashboard:
- `RPC_ENDPOINT`
- `CREATOR_PRIVATE_KEY`
- `TOKEN_ADDRESS`
- `API_KEY`

---

## 📁 Project Structure

```
src/
├── main.ts              # Entry point & orchestrator
├── config/              # Environment & constants
├── services/            # Solana & transaction services
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
```

---

## 🔒 Security

- ⚠️ **Never commit private keys** - use `.env` and Render secrets
- 🧪 Test with `DRY_RUN=true` first
- 🛑 Use `/control/pause` for emergencies
- 📊 Monitor logs regularly

---

## 📜 License

MIT

---

**Built for the pump.fun community** ❄️ Frostbyte
