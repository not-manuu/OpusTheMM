# Pre-Build Checklist & Key Decisions

Before starting the build, please review and answer these questions. This will ensure smooth implementation without interruptions.

---

## 🔑 Critical Decisions Required

### 1. Token Information

**Your pump.fun token details:**
- [ ] Token Address (Mint): `_______________________`
- [ ] Bonding Curve Address: `_______________________`
- [ ] Associated Bonding Curve: `_______________________`
- [ ] Creator Wallet Address: `_______________________`

**How to find these:**
- Go to your token on pump.fun
- Check URL or use Solana explorer
- Bonding curve addresses can be derived or found in token account data

---

### 2. Wallet Setup

**How many volume wallets do you want?**
- [ ] 3-5 wallets (Minimal, less organic)
- [ ] 5-10 wallets (Recommended, more natural)
- [ ] 10+ wallets (Maximum distribution)

**Chosen:** `___` wallets

**Do you already have these wallets created?**
- [ ] Yes, I have the private keys
- [ ] No, need help creating them

**Burn wallet setup:**
- [ ] Use dedicated burn wallet (Recommended)
- [ ] Use existing wallet

---

### 3. Distribution Parameters

**Fee claim threshold (when to claim fees):**
- [ ] 0.001 SOL (Very frequent, good for testing)
- [ ] 0.01 SOL (Recommended for production)
- [ ] 0.05 SOL (Less frequent)
- [ ] 0.1 SOL (Rare claims)

**Chosen:** `___` SOL

**Fee check interval:**
- [ ] Every 10 seconds (Aggressive)
- [ ] Every 30 seconds (Recommended)
- [ ] Every 60 seconds (Conservative)

**Chosen:** `___` seconds

---

### 4. Volume Creation Settings

**Minimum trade size:**
- [ ] 0.0001 SOL (Micro trades)
- [ ] 0.001 SOL (Recommended)
- [ ] 0.005 SOL (Moderate)

**Maximum trade size:**
- [ ] 0.01 SOL
- [ ] 0.05 SOL (Recommended)
- [ ] 0.1 SOL

**Slippage tolerance:**
- [ ] 1% (Tight, may fail)
- [ ] 3% (Recommended)
- [ ] 5% (Loose, always executes)

---

### 5. Buyback & Burn Settings

**Burn method:**
- [ ] SPL Token Burn (Recommended - reduces total supply)
- [ ] Send to dead address (Alternative)

**Chosen:** `_______________________`

**Maximum burn per transaction:**
- [ ] 1% of total supply
- [ ] 5% of total supply
- [ ] 10% of total supply (Recommended)
- [ ] No limit

**Chosen:** `___` % or `___` tokens

---

### 6. Airdrop Settings

**Minimum holding to qualify for airdrops:**
- [ ] 100,000 tokens
- [ ] 1,000,000 tokens (1M - Recommended)
- [ ] 10,000,000 tokens (10M)
- [ ] Custom: `___` tokens

**Minimum SOL to send (avoid dust):**
- [ ] 0.0001 SOL
- [ ] 0.001 SOL (Recommended)
- [ ] 0.01 SOL

**Maximum recipients per distribution:**
- [ ] 50 holders
- [ ] 100 holders (Recommended)
- [ ] 500 holders
- [ ] Unlimited

---

### 7. RPC Provider

**Which RPC provider will you use?**
- [ ] Helius (Developer plan: $49/month)
- [ ] QuickNode (Starter: $49/month)
- [ ] Chainstack (Growth: $99/month - Recommended)
- [ ] Other: `_______________________`

**Do you already have an account?**
- [ ] Yes, I have RPC URL and WebSocket URL
- [ ] No, need to sign up

---

### 8. Deployment Platform

**Confirm deployment target:**
- [ ] Render.com (Recommended in instructions)
- [ ] Railway.app (Alternative)
- [ ] DigitalOcean (Alternative)
- [ ] AWS/GCP (Advanced)
- [ ] Self-hosted VPS

**Chosen:** `_______________________`

---

### 9. Testing Approach

**Testing strategy:**
- [ ] Dry-run only (No real transactions)
- [ ] Devnet testing (If pump.fun devnet available)
- [ ] Mainnet with tiny amounts (0.001-0.01 SOL)
- [ ] Full mainnet (Confident in code)

**Chosen:** `_______________________`

**Test duration before production:**
- [ ] 1 day
- [ ] 3 days (Recommended)
- [ ] 1 week
- [ ] 2 weeks

---

### 10. Monitoring & Alerts

**How do you want to be alerted about critical issues?**
- [ ] Email
- [ ] Telegram bot
- [ ] Discord webhook
- [ ] SMS (via Twilio)
- [ ] Just logs (No alerts)

**Chosen:** `_______________________`

**Do you want a public dashboard?**
- [ ] Yes, build it alongside (Separate project)
- [ ] No, just internal stats
- [ ] Maybe later

---

### 11. Backend & Telegram Bot

**Do you want Telegram bot integration?**
- [ ] Yes, implement full Telegram bot
- [ ] Yes, but just notifications (no commands)
- [ ] No, skip for now

**Chosen:** `_______________________`

**If yes, provide:**
- Telegram Bot Token: `_______________________`
- Admin Chat IDs (comma-separated): `_______________________`

**Do you want REST API for frontend?**
- [ ] Yes, build full API
- [ ] Yes, but minimal endpoints
- [ ] No, skip for now

---

### 12. Budget Confirmation

**Monthly budget available:**
- [ ] $50-100 (Minimum viable)
- [ ] $100-200 (Recommended)
- [ ] $200+ (Comfortable)

**Breakdown:**
- Render/Hosting: $___
- RPC Provider: $___
- Transaction Fees: $___
- **Total:** $___/month

---

## 📋 Pre-Build Requirements

Please confirm you have:

### Technical
- [ ] Node.js 18+ installed locally
- [ ] Git installed
- [ ] GitHub account (for deployment)
- [ ] Code editor (VS Code, etc.)
- [ ] Terminal/command line access

### Blockchain
- [ ] Phantom or Solflare wallet
- [ ] Your token is live on pump.fun
- [ ] Creator wallet has some SOL (~0.1 SOL minimum)
- [ ] Access to token creator wallet's private key

### Services
- [ ] RPC provider account created
- [ ] Render.com account (or chosen platform)
- [ ] GitHub repository ready (or will create)

### Knowledge
- [ ] Basic understanding of Solana transactions
- [ ] Comfortable with environment variables
- [ ] Know how to use terminal/command line
- [ ] Understand tokenomics concepts

---

## ⚠️ Security Checklist

Before proceeding, acknowledge:

- [ ] I understand private keys will be stored in environment variables
- [ ] I will NEVER commit private keys to git
- [ ] I will use .env files locally (not committed)
- [ ] I will use Render's environment variables for production
- [ ] I have backups of all wallet private keys
- [ ] I understand the risks of automated trading
- [ ] I will test thoroughly before mainnet deployment
- [ ] I have a plan for emergency shutdown

---

## 🎯 Special Requirements or Customizations?

**Any specific needs not covered above?**

Example:
- Different distribution percentages (not 25/25/25/25)
- Time-based distribution rules
- Whale wallet exclusions for airdrops
- Custom volume patterns
- Integration with existing systems
- Special treasury wallet requirements

**List here:**
```
1. _______________________
2. _______________________
3. _______________________
```

---

## ✅ Ready to Build?

Once you've answered all the above:

1. **Review** all your answers
2. **Verify** you have all required accounts/services
3. **Confirm** your budget is allocated
4. **Check** you understand the system

**Then give the signal to start building!**

---

## 📞 Questions to Ask Before Starting

If anything above is unclear, ask now:

1. How do I find my bonding curve address?
2. How do I export private keys safely?
3. Which RPC provider is best for my budget?
4. Can I change distribution percentages later?
5. How do I set up the Telegram bot?
6. How do I create additional wallets?
7. Where does the treasury (Reindeer 4) send funds?
8. (Your questions here...)

---

**This checklist ensures we build exactly what you need, without back-and-forth during implementation.**

Save your answers and keep this file for reference!
