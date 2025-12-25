# Comprehensive Code Analysis: Pumpfun-Bonkfun-Bot
## Repository Structure & Implementation Guide

---

## 📁 **Repository Structure**

Based on the GitHub repository analysis, here's the complete structure:

```
pumpfun-bonkfun-bot/
├── src/                          # Main source code
│   ├── bot_runner.py            # Main bot execution entry point
│   ├── (other core modules)
│
├── bots/                         # Bot configuration files
│   ├── *.yaml                   # YAML config templates for strategies
│
├── idl/                          # Interface Definition Language files
│   ├── pump_fun.json            # Pump.fun program interface
│   ├── lets_bonk.json           # LetsBonk program interface
│
├── learning-examples/            # Educational examples & utilities
│   ├── listen-new-tokens/       # Token monitoring scripts
│   │   ├── listen_logsubscribe_abc.py
│   │   ├── compare_listeners.py
│   │
│   ├── listen-migrations/       # Migration tracking scripts
│   │   ├── listen_logsubscribe.py
│   │   ├── listen_blocksubscribe_old_raydium.py
│   │
│   ├── bonding-curve-progress/  # Bonding curve analysis
│   │   └── get_bonding_curve_status.py
│   │
│   └── compute_associated_bonding_curve.py
│
├── trades/                       # Trade history & logs
│
├── .env.example                  # Environment configuration template
├── pyproject.toml               # Python project configuration
└── README.md                    # Documentation
```

---

## 🔑 **Key Components Explained**

### **1. Bot Runner (`src/bot_runner.py`)**
- **Purpose**: Main execution engine
- **Features**:
  - Loads YAML configurations from `bots/` directory
  - Manages RPC connections to Solana
  - Orchestrates trading strategies
  - Handles multiple bot instances

**Key Capabilities**:
```python
# Platform support
- platform: "pump_fun"    # For pump.fun
- platform: "lets_bonk"   # For letsbonk.fun
```

---

### **2. Configuration System (`bots/*.yaml`)**

Example bot configuration structure:

```yaml
# Bot strategy parameters
platform: "pump_fun"              # Which platform to trade on
rpc_endpoint: "YOUR_RPC_URL"      # Solana RPC endpoint
private_key: "YOUR_KEY"           # Wallet private key

# Trading parameters
buy_amount: 0.001                 # SOL amount per trade
slippage: 30.0                    # Slippage tolerance (%)
cooldown: 15                      # Seconds to wait before buying

# Strategy settings
auto_sell: true                   # Auto-sell after buy
sell_delay: 60                    # Seconds before selling
take_profit: 2.0                  # 2x profit target
stop_loss: 0.5                    # 50% stop loss
```

---

### **3. Listener System**

The bot has **TWO MAIN LISTENING METHODS**:

#### **A. `blockSubscribe` Method** (Slower but Complete)
- Gets full block data
- More reliable for all token information
- Higher data usage
- Supported by fewer RPC providers

#### **B. `logsSubscribe` Method** (Faster but Requires Computation)
- Listens only to program logs
- **FASTER** for sniping
- Requires computing `associatedBondingCurve` address
- Lower data usage
- Supported by all RPC providers

**Key Discovery** (from Issue #26):
```python
# Computing associatedBondingCurve from logsSubscribe data
# Seeds required (in order):
seeds = [
    bondingCurve_address,
    TOKEN_PROGRAM_ID,  # TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
    mint_address
]

# Program to derive from:
ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
```

---

### **4. Critical Files for Your Project**

#### **A. Token Listener** (`listen_logsubscribe_abc.py`)
**Purpose**: Detect new tokens in real-time
```python
# Monitors pump.fun program for "Create" instructions
# Extracts:
- mint address (token address)
- bondingCurve address
- associatedBondingCurve (computed)
- user (creator address)
- signature (transaction)
```

#### **B. Migration Listener** (`listen_logsubscribe.py`)
**Purpose**: Track when tokens graduate to PumpSwap/Raydium
```python
# Detects when bonding curve completes
# Extracts:
- pool address (liquidity pool)
- migration signature
- token mint
```

#### **C. Bonding Curve Status** (`get_bonding_curve_status.py`)
**Purpose**: Check token progress on bonding curve
```python
# Gets bonding curve data:
- virtualTokenReserves
- virtualSolReserves
- realTokenReserves
- realSolReserves
- tokenTotalSupply
- complete (graduation status)
```

---

## 🎯 **How to Adapt for Your Tokenomics Project**

### **Your Goal**: 
Create a system that automatically distributes fees:
- 20% → Volume creation
- 20% → Buybacks & Burns
- 20% → Airdrops to holders
- 20% → Liquidity injection
- 20% → Operations/Treasury

---

## 🏗️ **Architecture for Your System**

### **Phase 1: Fee Collection Module**

Based on pump.fun's creator fee system (0.05% of volume):

```python
# fee_collector.py

import asyncio
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

class FeeCollector:
    def __init__(self, token_address: str, creator_wallet: Pubkey):
        self.token_address = token_address
        self.creator_wallet = creator_wallet
        self.accumulated_fees = 0.0
        
    async def monitor_fees(self):
        """Monitor and claim creator fees in real-time"""
        while True:
            # Check creator fee balance
            fee_balance = await self.get_creator_fees()
            
            if fee_balance > 0:
                # Claim fees
                await self.claim_fees()
                self.accumulated_fees += fee_balance
                
                # Trigger distribution
                await self.distribute_fees(fee_balance)
                
            await asyncio.sleep(10)  # Check every 10 seconds
    
    async def get_creator_fees(self):
        """Get current creator fee balance"""
        # Query pump.fun program for creator rewards
        # Returns SOL amount
        pass
    
    async def claim_fees(self):
        """Claim accumulated creator fees"""
        # Execute claim_fee instruction on pump.fun
        pass
    
    async def distribute_fees(self, amount: float):
        """Distribute fees according to tokenomics"""
        # Split fees into 5 parts (20% each)
        volume_share = amount * 0.20
        buyback_share = amount * 0.20
        airdrop_share = amount * 0.20
        liquidity_share = amount * 0.20
        treasury_share = amount * 0.20
        
        # Execute distributions
        await self.create_volume(volume_share)
        await self.buyback_and_burn(buyback_share)
        await self.airdrop_to_holders(airdrop_share)
        await self.add_liquidity(liquidity_share)
        await self.send_to_treasury(treasury_share)
```

---

### **Phase 2: Volume Creation Module**

```python
# volume_creator.py

from typing import List
import random

class VolumeCreator:
    def __init__(self, token_address: str, wallet_pool: List[Pubkey]):
        self.token_address = token_address
        self.wallet_pool = wallet_pool  # Multiple wallets for organic look
        
    async def create_volume(self, sol_amount: float):
        """Create trading volume using accumulated fees"""
        
        # Split amount across multiple wallets
        num_trades = random.randint(3, 8)
        amounts = self.split_amount(sol_amount, num_trades)
        
        for wallet, amount in zip(self.wallet_pool[:num_trades], amounts):
            # Execute buy transaction
            await self.execute_buy(wallet, amount)
            
            # Random delay for organic appearance
            await asyncio.sleep(random.uniform(5, 30))
    
    async def execute_buy(self, wallet: Pubkey, amount: float):
        """Execute a buy transaction on pump.fun"""
        # Build buy instruction
        # Sign with wallet
        # Send transaction
        pass
    
    def split_amount(self, total: float, parts: int) -> List[float]:
        """Split amount into random parts"""
        # Randomize to look organic
        amounts = [random.uniform(0.5, 1.5) for _ in range(parts)]
        total_weight = sum(amounts)
        return [(amt / total_weight) * total for amt in amounts]
```

---

### **Phase 3: Buyback & Burn Module**

```python
# buyback_burn.py

class BuybackBurner:
    def __init__(self, token_address: str, burn_wallet: Pubkey):
        self.token_address = token_address
        self.burn_wallet = burn_wallet  # Wallet to send burned tokens
        
    async def buyback_and_burn(self, sol_amount: float):
        """Buy tokens from market and burn them"""
        
        # Step 1: Execute buyback
        tokens_bought = await self.execute_buyback(sol_amount)
        
        # Step 2: Burn tokens
        await self.burn_tokens(tokens_bought)
        
        # Step 3: Log burn event
        await self.log_burn_event(tokens_bought, sol_amount)
    
    async def execute_buyback(self, sol_amount: float) -> int:
        """Buy tokens from pump.fun/PumpSwap"""
        # Execute buy instruction
        # Return number of tokens received
        pass
    
    async def burn_tokens(self, token_amount: int):
        """Burn tokens permanently"""
        # Option 1: Send to burn address (0x000...dead)
        # Option 2: Actually burn using token program
        
        from spl.token.instructions import burn, BurnParams
        
        # Burn instruction
        burn_ix = burn(
            BurnParams(
                program_id=TOKEN_PROGRAM_ID,
                account=token_account,
                mint=self.token_address,
                owner=self.burn_wallet,
                amount=token_amount
            )
        )
        # Execute transaction
        pass
    
    async def log_burn_event(self, tokens: int, sol_spent: float):
        """Record burn for transparency"""
        # Log to file or database
        # Can be displayed on website
        print(f"🔥 BURNED: {tokens:,} tokens | SOL spent: {sol_spent:.4f}")
```

---

### **Phase 4: Airdrop Module**

```python
# airdrop_distributor.py

from typing import Dict, List

class AirdropDistributor:
    def __init__(self, token_address: str, min_holding: int):
        self.token_address = token_address
        self.min_holding = min_holding  # Minimum tokens to qualify (e.g., 1M)
        
    async def airdrop_to_holders(self, sol_amount: float):
        """Distribute SOL to qualified token holders"""
        
        # Step 1: Get all holders
        holders = await self.get_qualified_holders()
        
        # Step 2: Calculate distribution
        distribution = self.calculate_distribution(holders, sol_amount)
        
        # Step 3: Execute airdrops
        await self.execute_airdrop(distribution)
    
    async def get_qualified_holders(self) -> Dict[str, int]:
        """Get all holders with minimum balance"""
        # Query token accounts
        # Filter by minimum holding
        # Return {wallet_address: token_balance}
        pass
    
    def calculate_distribution(self, 
                              holders: Dict[str, int], 
                              total_sol: float) -> Dict[str, float]:
        """Calculate proportional SOL distribution"""
        total_tokens = sum(holders.values())
        
        distribution = {}
        for wallet, balance in holders.items():
            # Proportional to holding
            share = (balance / total_tokens) * total_sol
            distribution[wallet] = share
            
        return distribution
    
    async def execute_airdrop(self, distribution: Dict[str, float]):
        """Send SOL to holders"""
        for wallet_address, sol_amount in distribution.items():
            if sol_amount >= 0.001:  # Minimum to avoid dust
                await self.send_sol(wallet_address, sol_amount)
                await asyncio.sleep(1)  # Rate limiting
    
    async def send_sol(self, recipient: str, amount: float):
        """Transfer SOL to recipient"""
        from solana.transaction import Transaction
        from solders.system_program import transfer, TransferParams
        
        # Build transfer instruction
        # Sign and send
        pass
```

---

### **Phase 5: Liquidity Injection Module**

```python
# liquidity_injector.py

class LiquidityInjector:
    def __init__(self, token_address: str, pool_address: str):
        self.token_address = token_address
        self.pool_address = pool_address  # PumpSwap or Raydium pool
        
    async def add_liquidity(self, sol_amount: float):
        """Inject SOL into liquidity pool"""
        
        # Check if token graduated to pool
        is_graduated = await self.check_graduation()
        
        if is_graduated:
            # Add to PumpSwap/Raydium pool
            await self.inject_to_pool(sol_amount)
        else:
            # Store for later (bonding curve still active)
            await self.queue_for_graduation(sol_amount)
    
    async def check_graduation(self) -> bool:
        """Check if token graduated to AMM"""
        # Query bonding curve status
        # Return True if complete
        pass
    
    async def inject_to_pool(self, sol_amount: float):
        """Add liquidity to PumpSwap pool"""
        # Execute addLiquidity instruction
        # This increases pool size and reduces slippage
        pass
    
    async def queue_for_graduation(self, sol_amount: float):
        """Store SOL until token graduates"""
        # Hold in treasury until graduation
        pass
```

---

## 🔧 **Integration: Main Bot Loop**

```python
# main_tokenomics_bot.py

import asyncio
from fee_collector import FeeCollector
from volume_creator import VolumeCreator
from buyback_burn import BuybackBurner
from airdrop_distributor import AirdropDistributor
from liquidity_injector import LiquidityInjector

class TokenomicsBot:
    def __init__(self, config):
        self.token_address = config['token_address']
        self.creator_wallet = config['creator_wallet']
        
        # Initialize modules
        self.fee_collector = FeeCollector(
            self.token_address,
            self.creator_wallet
        )
        
        self.volume_creator = VolumeCreator(
            self.token_address,
            config['volume_wallets']
        )
        
        self.buyback_burner = BuybackBurner(
            self.token_address,
            config['burn_wallet']
        )
        
        self.airdrop_distributor = AirdropDistributor(
            self.token_address,
            config['min_holding']
        )
        
        self.liquidity_injector = LiquidityInjector(
            self.token_address,
            config['pool_address']
        )
    
    async def start(self):
        """Start the tokenomics bot"""
        print("🚀 Tokenomics Bot Starting...")
        print(f"📍 Token: {self.token_address}")
        print("📊 Distribution: 20% Volume | 20% Buyback | 20% Airdrop | 20% Liquidity | 20% Treasury")
        
        # Start fee monitoring loop
        await self.fee_collector.monitor_fees()

# Run the bot
if __name__ == "__main__":
    config = {
        'token_address': 'YOUR_TOKEN_ADDRESS',
        'creator_wallet': 'YOUR_WALLET',
        'volume_wallets': ['WALLET1', 'WALLET2', 'WALLET3'],
        'burn_wallet': 'BURN_WALLET',
        'min_holding': 1_000_000,  # 1M tokens minimum
        'pool_address': 'POOL_ADDRESS'
    }
    
    bot = TokenomicsBot(config)
    asyncio.run(bot.start())
```

---

## 📊 **Key Differences from Snowball's Approach**

| Feature | Snowball (Concept Only) | Your Implementation |
|---------|------------------------|---------------------|
| **Volume Creation** | ✅ 100% of fees → buys | ✅ 20% of fees → buys |
| **Buyback & Burn** | ❌ Not included | ✅ 20% of fees → buyback/burn |
| **Airdrops** | ❌ Not included | ✅ 20% of fees → holder airdrops |
| **Liquidity** | ❌ Not included | ✅ 20% of fees → pool injection |
| **Treasury** | ❌ Not included | ✅ 20% of fees → operations |
| **Code Availability** | ❌ Documentation only | ✅ Full implementation |

---

## 🛠️ **Tools & Libraries You'll Need**

```toml
# pyproject.toml dependencies

[project]
name = "tokenomics-bot"
version = "1.0.0"
dependencies = [
    "solana>=0.30.0",
    "solders>=0.18.0",
    "anchorpy>=0.18.0",
    "aiohttp>=3.9.0",
    "python-dotenv>=1.0.0",
    "pyyaml>=6.0.0"
]
```

---

## 🎓 **Learning Path from Pumpfun Bot**

### **Start Here**:
1. **`learning-examples/listen-new-tokens/listen_logsubscribe_abc.py`**
   - Learn how to detect new tokens
   - Understand log parsing

2. **`learning-examples/bonding-curve-progress/get_bonding_curve_status.py`**
   - Learn bonding curve mechanics
   - Track token progress

3. **`src/bot_runner.py`**
   - Study main execution flow
   - Understand configuration system

### **Then Build**:
1. **Fee Collection** (easiest)
2. **Volume Creation** (moderate)
3. **Treasury Management** (moderate)
4. **Buyback & Burn** (advanced)
5. **Airdrop Distribution** (advanced)
6. **Liquidity Injection** (most complex)

---

## 🚨 **Critical Considerations**

### **1. RPC Provider**
- You NEED a **high-performance RPC** (Chainstack, Helius, QuickNode)
- Public RPCs will NOT work
- Budget: $50-200/month for production

### **2. Transaction Speed**
- Use **priority fees** for faster confirmation
- Implement **transaction retries**
- Monitor **fee market** dynamically

### **3. Security**
- **NEVER** hardcode private keys
- Use environment variables
- Implement wallet encryption
- Separate hot/cold wallets

### **4. Compliance**
- Ensure airdrops comply with regulations
- Log all transactions for transparency
- Consider KYC for large distributions

---

## 📈 **Next Steps**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chainstacklabs/pumpfun-bonkfun-bot.git
   cd pumpfun-bonkfun-bot
   ```

2. **Study the code**:
   - Start with `learning-examples/`
   - Read through issue discussions
   - Understand the IDL files

3. **Build your modules**:
   - Start with `FeeCollector`
   - Test on devnet first
   - Add modules incrementally

4. **Test thoroughly**:
   - Use Solana devnet
   - Small amounts on mainnet
   - Monitor gas costs

5. **Deploy & Monitor**:
   - Set up logging
   - Create dashboard
   - Monitor wallet balances

---

## 🎯 **Summary**

The **pumpfun-bonkfun-bot** provides an excellent foundation:
- ✅ Real-time token monitoring
- ✅ Automated trading execution
- ✅ Bonding curve integration
- ✅ Migration tracking
- ✅ Configuration system

**Your additions needed**:
- Fee collection automation
- Multi-wallet distribution logic
- Burn mechanism
- Airdrop calculator
- Liquidity management

**Result**: A fully automated tokenomics system that creates sustainable growth through algorithmic fee distribution.

---

## 📞 **Resources**

- **Original Bot**: https://github.com/chainstacklabs/pumpfun-bonkfun-bot
- **Pump.fun Docs**: https://github.com/pump-fun/pump-public-docs
- **Solana Docs**: https://solana.com/docs
- **Chainstack Tutorial**: https://docs.chainstack.com/docs/solana-creating-a-pumpfun-bot

---

**Ready to build? Start with Phase 1: Fee Collection!** 🚀
