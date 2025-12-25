# Phase 8: Testing & Deployment to Render

## Objective
Thoroughly test the tokenomics bot on devnet and mainnet, then deploy to Render.com for 24/7 operation with proper monitoring and error handling.

---

## Testing Strategy

### Phase 1: Local Development Testing

```
STEP 1: DRY-RUN TESTING (No Blockchain Interaction)

Create .env.test file:
```
DRY_RUN=true
RPC_ENDPOINT=https://api.devnet.solana.com
CREATOR_PRIVATE_KEY=your_test_key
VOLUME_WALLET_KEYS=test_key1,test_key2,test_key3
BURN_WALLET_PRIVATE_KEY=test_key
TOKEN_ADDRESS=test_token_mint
BONDING_CURVE_ADDRESS=test_bonding_curve
ASSOCIATED_BONDING_CURVE=test_associated
MIN_HOLDER_THRESHOLD=1000000
MINIMUM_CLAIM_THRESHOLD=0.01
FEE_CHECK_INTERVAL=10000
LOG_LEVEL=debug
```

Run:
```bash
npm run build
npm start
```

Verify:
- [ ] All modules initialize without errors
- [ ] Logs show proper flow
- [ ] Fee check cycle runs
- [ ] Distribution logic executes (mock mode)
- [ ] Graceful shutdown works (Ctrl+C)
- [ ] No crashes or uncaught exceptions

Expected output:
```
═══════════════════════════════════════════
  🤖 TOKENOMICS BOT STARTING
═══════════════════════════════════════════

Distribution:
  💰 20% → Volume Creation
  🔥 20% → Buyback & Burn
  🎁 20% → Holder Airdrops
  💧 20% → Liquidity Injection
  🏦 20% → Treasury

[INFO] Fee collector starting...
[INFO] Checking fees...
[DEBUG] Fee balance: 0
[DEBUG] Below threshold, waiting...
```
```

---

### Phase 2: Devnet Testing

```
STEP 2: DEVNET INTEGRATION TESTING

Prerequisites:
1. Get devnet SOL from faucet: https://faucet.solana.com/
2. Create test token on pump.fun devnet (if available)
3. Or use existing devnet token

Update .env for devnet:
```
DRY_RUN=false
RPC_ENDPOINT=https://api.devnet.solana.com
RPC_WEBSOCKET_ENDPOINT=wss://api.devnet.solana.com
# ... real devnet keys and addresses
```

Testing Checklist:
- [ ] Fee collection from bonding curve
- [ ] Fee claiming transaction succeeds
- [ ] Volume creation trades execute
- [ ] Buyback and burn transactions work
- [ ] Airdrop distribution to test holders
- [ ] Liquidity queuing (pre-graduation)
- [ ] All transactions confirmed on devnet explorer
- [ ] Stats tracking accurate
- [ ] Error recovery (disconnect RPC and reconnect)

Run devnet tests:
```bash
npm run build
npm start

# In another terminal, monitor
watch -n 5 'npm run status' # If you create a status script
```

Monitor for:
- Transaction signatures
- Module statistics
- Error logs
- Wallet balances
```

---

### Phase 3: Mainnet Testing (Small Amounts)

```
STEP 3: MAINNET PILOT TEST

⚠️ CRITICAL SAFETY MEASURES:
- Use TINY amounts (0.001-0.01 SOL)
- Set maximum limits in config
- Have emergency stop ready
- Monitor continuously

Create .env.mainnet:
```
DRY_RUN=false
RPC_ENDPOINT=https://your-premium-rpc.com
RPC_WEBSOCKET_ENDPOINT=wss://your-premium-rpc.com
CREATOR_PRIVATE_KEY=your_actual_key_base58
VOLUME_WALLET_KEYS=key1,key2,key3
BURN_WALLET_PRIVATE_KEY=burn_key
TOKEN_ADDRESS=your_actual_token
BONDING_CURVE_ADDRESS=your_bonding_curve
ASSOCIATED_BONDING_CURVE=your_associated
MINIMUM_CLAIM_THRESHOLD=0.001  # Very low for testing
LOG_LEVEL=info
```

Mainnet Test Plan:

Day 1: Initialization Test (1 hour)
- Start bot
- Wait for first fee accumulation
- Verify claim transaction
- Check distribution executes
- Monitor all module outputs
- Verify on Solscan

Day 2: Extended Run (24 hours)
- Let bot run continuously
- Monitor logs every 4 hours
- Check wallet balances
- Verify distributions happening
- Review daily summary

Day 3: Stress Test
- Generate trading volume manually
- Force fee accumulation
- Verify rapid distribution cycles
- Test error scenarios (RPC disconnect)
- Verify recovery mechanisms

Verification URLs:
- Solscan: https://solscan.io
- Pump.fun: https://pump.fun
- Check all transaction signatures
```

---

## Deployment to Render

### Step 1: Prepare for Deployment

```bash
# 1. Create render.yaml
cat > render.yaml << 'EOF'
services:
  - type: web
    name: tokenomics-bot
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: RPC_ENDPOINT
        sync: false
      - key: RPC_WEBSOCKET_ENDPOINT
        sync: false
      - key: CREATOR_PRIVATE_KEY
        sync: false
      - key: VOLUME_WALLET_KEYS
        sync: false
      - key: BURN_WALLET_PRIVATE_KEY
        sync: false
      - key: TOKEN_ADDRESS
        sync: false
      - key: BONDING_CURVE_ADDRESS
        sync: false
      - key: ASSOCIATED_BONDING_CURVE
        sync: false
      - key: POOL_ADDRESS
        sync: false
      - key: MIN_HOLDER_THRESHOLD
        value: 1000000
      - key: MINIMUM_CLAIM_THRESHOLD
        value: 0.01
      - key: FEE_CHECK_INTERVAL
        value: 30000
      - key: DRY_RUN
        value: false
      - key: LOG_LEVEL
        value: info
EOF

# 2. Update package.json scripts
# Add to package.json:
{
  "scripts": {
    "start": "node dist/main.js",
    "build": "tsc",
    "dev": "ts-node src/main.ts"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}

# 3. Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.*
!.env.example
*.log
.DS_Store
EOF

# 4. Ensure all dependencies in package.json
npm install --save \
  @solana/web3.js \
  @solana/spl-token \
  @coral-xyz/anchor \
  bs58 \
  dotenv \
  winston

npm install --save-dev \
  typescript \
  @types/node \
  ts-node
```

---

### Step 2: Deploy to Render

```
DEPLOYMENT STEPS:

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit - Tokenomics bot"
git branch -M main
git remote add origin https://github.com/yourusername/tokenomics-bot.git
git push -u origin main
```

2. Connect to Render:
- Go to https://render.com
- Sign up / Log in
- Click "New +" → "Background Worker" (not Web Service)
- Connect your GitHub repository
- Select the repo

3. Configure on Render Dashboard:
- Name: tokenomics-bot
- Environment: Node
- Build Command: npm install && npm run build
- Start Command: npm start
- Plan: Starter ($7/month) or higher

4. Add Environment Variables:
Go to "Environment" tab and add ALL variables from .env:
⚠️ NEVER commit these to git!

Required Variables:
- RPC_ENDPOINT (your Helius/QuickNode URL)
- RPC_WEBSOCKET_ENDPOINT
- CREATOR_PRIVATE_KEY (base58 encoded)
- VOLUME_WALLET_KEYS (comma-separated base58 keys)
- BURN_WALLET_PRIVATE_KEY
- TOKEN_ADDRESS
- BONDING_CURVE_ADDRESS
- ASSOCIATED_BONDING_CURVE
- MIN_HOLDER_THRESHOLD
- MINIMUM_CLAIM_THRESHOLD
- FEE_CHECK_INTERVAL
- LOG_LEVEL

Optional:
- POOL_ADDRESS (if graduated)
- DRY_RUN (false for production)

5. Deploy:
- Click "Create Background Worker"
- Render will build and deploy automatically
- Monitor logs in real-time

6. Verify Deployment:
- Check logs for startup messages
- Verify "Bot started successfully"
- Watch for fee collection cycles
- Monitor for errors
```

---

### Step 3: Production Monitoring

```
MONITORING SETUP:

1. Render Logs:
- Go to Render dashboard → your service → Logs
- Keep this open in a browser tab
- Check periodically

2. Set up Log Alerts (Optional):
- Use Render's notification settings
- Or export logs to external service (Papertrail, Loggly)

3. Create Monitoring Script:
```typescript
// scripts/monitor.ts
import { Connection, PublicKey } from '@solana/web3.js';

async function checkBotHealth() {
  const connection = new Connection(process.env.RPC_ENDPOINT!);

  // Check creator wallet balance
  const balance = await connection.getBalance(
    new PublicKey(process.env.CREATOR_PUBLIC_KEY!)
  );

  console.log(`Creator Balance: ${balance / 1e9} SOL`);

  // Check recent transactions
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(process.env.CREATOR_PUBLIC_KEY!),
    { limit: 5 }
  );

  console.log('Recent transactions:', signatures.length);

  // Alert if balance too low
  if (balance < 0.01 * 1e9) {
    console.error('⚠️ WARNING: Low balance!');
  }
}

checkBotHealth().catch(console.error);
```

Run locally:
```bash
ts-node scripts/monitor.ts
```

4. Daily Checks:
- Review daily summary in logs
- Check wallet balances
- Verify distributions happening
- Monitor Solscan for bot transactions
```

---

## Troubleshooting Guide

### Common Issues

```
ISSUE 1: "Connection unhealthy"
Solution:
- Check RPC endpoint is correct
- Verify RPC provider status
- Switch to backup RPC if needed

ISSUE 2: "Transaction failed"
Solution:
- Check wallet has enough SOL for fees
- Verify priority fees are set
- Check Solana network status
- Review transaction logs

ISSUE 3: "Module initialization failed"
Solution:
- Verify all environment variables set
- Check private keys are base58 encoded
- Validate token and bonding curve addresses
- Review logs for specific error

ISSUE 4: Bot crashes repeatedly
Solution:
- Check error logs
- Verify RPC connection stable
- Ensure wallets have sufficient balance
- Review recent Solana network issues

ISSUE 5: Distributions not happening
Solution:
- Check fee balance meets threshold
- Verify bonding curve address correct
- Review fee collector logs
- Ensure modules are wired correctly
```

---

## Emergency Procedures

```
EMERGENCY STOP:

If something goes wrong:

1. Via Render Dashboard:
   - Go to your service
   - Click "Suspend"
   - Bot stops immediately

2. Via Git (graceful):
   - Set DRY_RUN=true in environment
   - Restart service
   - Bot runs but doesn't execute transactions

3. Emergency Withdrawal Script:
```typescript
// scripts/emergency-withdraw.ts
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

async function emergencyWithdraw() {
  const connection = new Connection(process.env.RPC_ENDPOINT!);

  const wallet = Keypair.fromSecretKey(
    bs58.decode(process.env.CREATOR_PRIVATE_KEY!)
  );

  const balance = await connection.getBalance(wallet.publicKey);

  console.log(`Withdrawing ${balance / LAMPORTS_PER_SOL} SOL...`);

  // Transfer to safe wallet
  // Implementation here...
}
```

RECOVERY CHECKLIST:
- [ ] Stop bot
- [ ] Review logs for root cause
- [ ] Fix issue
- [ ] Test fix locally
- [ ] Redeploy
- [ ] Monitor closely
```

---

## Cost Breakdown

```
MONTHLY COSTS:

Development & Testing:
- Solana Devnet: FREE
- Local testing: FREE
- Mainnet testing: ~$20 (transaction fees)

Production (Monthly):
- Render Background Worker: $7-25/month
  - Starter: $7/month (512MB RAM)
  - Standard: $25/month (2GB RAM) - Recommended

- RPC Provider: $50-200/month
  - Helius Free: 0 (limited)
  - Helius Developer: $49/month
  - QuickNode Starter: $49/month
  - Chainstack Growth: $99/month (recommended for production)

- Transaction Fees: $5-50/month (depends on volume)
  - ~0.000005 SOL per transaction
  - With priority fees: ~0.0001 SOL per transaction

TOTAL: $60-275/month

Recommended Production Stack:
- Render Standard: $25/month
- Chainstack Growth: $99/month
- Transaction fees: ~$20/month
= $144/month
```

---

## Success Criteria

Final verification checklist:

- [ ] Dry-run mode tested thoroughly
- [ ] Devnet testing complete (if available)
- [ ] Mainnet pilot test successful
- [ ] All modules functioning correctly
- [ ] Deployed to Render successfully
- [ ] Environment variables secured
- [ ] Monitoring in place
- [ ] Emergency procedures documented
- [ ] All transactions verified on Solscan
- [ ] Daily summaries generating
- [ ] No errors in production logs (24h)
- [ ] Fee collection working
- [ ] Distributions executing correctly

---

## Post-Deployment

```
WEEK 1: INTENSIVE MONITORING
- Check logs 3x daily
- Verify all distributions
- Monitor wallet balances
- Review daily summaries
- Test emergency stop

WEEK 2-4: REGULAR MONITORING
- Check logs daily
- Review weekly summaries
- Verify tokenomics metrics
- Optimize if needed

ONGOING: MAINTENANCE
- Weekly log reviews
- Monthly cost analysis
- Performance optimization
- Feature improvements
```

---

## Documentation for Users

Create a public-facing dashboard showing:
- Total fees collected
- Volume created
- Tokens burned
- SOL distributed to holders
- Liquidity injected
- Real-time stats

This can be a separate project using the bot's exported data.

---

## Next Steps After Deployment

1. **Community Communication**:
   - Announce tokenomics automation
   - Share transparency reports
   - Show burn transactions

2. **Optimization**:
   - Tune distribution percentages based on results
   - Optimize transaction timing
   - Reduce costs where possible

3. **Expansion**:
   - Add more volume wallets
   - Implement advanced strategies
   - Create public dashboard
   - Add Telegram/Discord notifications

---

## Congratulations! 🎉

You now have a fully automated tokenomics bot running 24/7, handling:
- ✅ Fee collection
- ✅ Volume creation
- ✅ Buyback & burn
- ✅ Holder airdrops
- ✅ Liquidity injection
- ✅ Treasury management

**The system is now autonomous and sustainable!**
