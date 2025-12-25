# Tokenomics Bot Build Instructions

## Overview
This folder contains step-by-step prompts for building a fully automated tokenomics bot for Solana pump.fun tokens.

**🎅 Santa and His 4 Reindeer System:**
- **Santa** (Fee Collector) - Collects fees and orchestrates distribution
- **Reindeer 1** (Volume Creator) - 25% → Volume Creation
- **Reindeer 2** (Buyback Burner) - 25% → Buyback & Burn
- **Reindeer 3** (Airdrop Distributor) - 25% → Holder Airdrops
- **Reindeer 4** (Treasury Manager) - 25% → Treasury/Operations

The system also includes a **Backend API** for:
- Telegram bot integration
- Frontend data serving
- Real-time stats and logs
- Public transparency dashboard

## Technology Stack
- **Language**: Node.js/TypeScript
- **Blockchain**: Solana
- **Platform**: pump.fun
- **Deployment**: Render.com

## Build Order

Execute these prompts **in order**. Each phase builds on the previous one.

### Phase 0: Foundation
**File**: `00-project-setup.md`
- Initialize Node.js/TypeScript project
- Set up project structure
- Configure dependencies
- Create environment configuration

**Estimated Time**: 15-20 minutes

---

### Phase 1: Core Infrastructure
**File**: `01-solana-connection.md`
- Set up Solana RPC connection
- Create wallet utilities
- Implement transaction helpers
- Add error handling and retry logic

**Estimated Time**: 30-45 minutes

---

### Phase 2: Fee Collection
**File**: `02-fee-collector.md`
- Monitor creator fees from pump.fun
- Implement fee claiming mechanism
- Add fee distribution trigger
- Create logging system

**Estimated Time**: 45-60 minutes

---

### Phase 3: Volume Creation
**File**: `03-volume-creator.md`
- Multi-wallet trading system
- Randomized buy timing
- Organic volume patterns
- Transaction validation

**Estimated Time**: 45-60 minutes

---

### Phase 4: Buyback & Burn
**File**: `04-buyback-burn.md`
- Token buyback mechanism
- Burn implementation
- Burn event logging
- Transparency dashboard data

**Estimated Time**: 45-60 minutes

---

### Phase 5: Airdrop Distribution (Reindeer 3)
**File**: `05-airdrop-distributor.md`
- Holder snapshot system
- Proportional distribution calculator
- Minimum holding threshold
- Mass SOL transfer optimization

**Estimated Time**: 60-75 minutes

---

### Phase 6: Backend API & Data Layer
**File**: `06-backend-api.md`
- Express.js REST API
- WebSocket support for real-time updates
- Telegram bot integration endpoints
- Stats export for frontend
- Database integration (optional)

**Estimated Time**: 45-60 minutes

---

### Phase 7: Main Orchestration (Santa)
**File**: `07-main-orchestrator.md`
- Integrate all modules
- Create main bot loop
- Implement health monitoring
- Add graceful shutdown

**Estimated Time**: 30-45 minutes

---

### Phase 8: Testing & Deployment
**File**: `08-testing-deployment.md`
- Devnet testing strategy
- Mainnet testing (small amounts)
- Render deployment setup
- Environment configuration
- Monitoring and alerts

**Estimated Time**: 60-90 minutes

---

## Total Estimated Build Time
**6-7 hours** for complete implementation (4 Reindeer system + Backend API)

---

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] TypeScript knowledge (intermediate)
- [ ] Solana wallet with SOL (for testing)
- [ ] RPC provider account (Helius, QuickNode, or Chainstack)
- [ ] Render.com account (free tier to start)
- [ ] Basic understanding of Solana transactions
- [ ] pump.fun token address (for your token)

---

## Cost Considerations

### Development (Testing)
- Solana Devnet: Free
- Mainnet testing: ~0.1-0.5 SOL (~$15-75)

### Production (Monthly)
- Render.com: $7-25/month
- RPC Provider: $50-200/month
- Transaction fees: Variable (depends on volume)
- **Total**: ~$60-250/month

---

## Security Checklist

Before deployment, verify:
- [ ] Private keys stored in environment variables only
- [ ] Never commit `.env` file
- [ ] Separate hot/cold wallets
- [ ] Rate limiting implemented
- [ ] Transaction monitoring enabled
- [ ] Emergency shutdown mechanism
- [ ] All modules tested on devnet
- [ ] Small mainnet test completed

---

## Support & Resources

- **Solana Docs**: https://solana.com/docs
- **@solana/web3.js**: https://solana-labs.github.io/solana-web3.js/
- **pump.fun Docs**: https://github.com/pump-fun/pump-public-docs
- **Render Docs**: https://render.com/docs

---

## How to Use These Instructions

1. **Review all files** in this folder first
2. **Ask questions** about anything unclear
3. **Approve the plan** before implementation begins
4. **Execute one phase at a time** - don't skip ahead
5. **Test each module** before moving to the next
6. **Request modifications** to prompts if needed

---

## Next Steps

👉 **Start by reviewing**: `00-project-setup.md`

Once you've reviewed all instruction files and are satisfied with the approach, give the approval to begin implementation.

---

**Good luck! 🚀**
