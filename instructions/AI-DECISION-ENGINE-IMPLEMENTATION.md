# AI Decision Engine Implementation Guide

## Overview

This document outlines the complete implementation plan for adding an AI-powered decision engine to Frostbyte. The AI (Claude) will analyze real-time market data and decide how to allocate collected creator fees across the four reindeer modules, with full transparency via a "train of thought" display.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1: Type Definitions](#phase-1-type-definitions)
4. [Phase 2: Market Data Collector](#phase-2-market-data-collector)
5. [Phase 3: Claude Client with Streaming](#phase-3-claude-client-with-streaming)
6. [Phase 4: Decision Engine](#phase-4-decision-engine)
7. [Phase 5: WebSocket Events](#phase-5-websocket-events)
8. [Phase 6: Fee Collector Integration](#phase-6-fee-collector-integration)
9. [Phase 7: Main.ts Integration](#phase-7-maints-integration)
10. [Phase 8: Environment Configuration](#phase-8-environment-configuration)
11. [Phase 9: Dashboard - AI Brain Component](#phase-9-dashboard---ai-brain-component)
12. [Phase 10: Dashboard - Market Overview Component](#phase-10-dashboard---market-overview-component)
13. [Phase 11: Dashboard Page Integration](#phase-11-dashboard-page-integration)
14. [Phase 12: Testing](#phase-12-testing)
15. [API Reference](#api-reference)
16. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           FROSTBYTE AI ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  DATA SOURCES                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │ Jupiter API  │    │ Birdeye API  │    │ On-Chain     │                 │
│  │ (Price/Vol)  │    │ (Analytics)  │    │ (Helius)     │                 │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                 │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             ▼                                              │
│                   ┌─────────────────┐                                      │
│                   │ Market Data     │                                      │
│                   │ Collector       │                                      │
│                   └────────┬────────┘                                      │
│                            │                                               │
│                            ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │                 AI DECISION ENGINE                       │              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │              │
│  │  │ Prompt      │  │ Claude API  │  │ Decision    │      │              │
│  │  │ Builder     │─▶│ (Streaming) │─▶│ Parser      │      │              │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘      │              │
│  │                          │                               │              │
│  │                          ▼ Stream                        │              │
│  │                   ┌─────────────┐                        │              │
│  │                   │ Thought     │───────────────────────────▶ WebSocket │
│  │                   │ Broadcaster │                        │   (Dashboard)│
│  │                   └─────────────┘                        │              │
│  └─────────────────────────────────────────────────────────┘              │
│                            │                                               │
│                            ▼                                               │
│         ┌──────────────────┼──────────────────┐                           │
│         ▼                  ▼                  ▼                            │
│    ┌─────────┐       ┌─────────┐        ┌─────────┐       ┌─────────┐    │
│    │🦌Volume │       │🦌Burn   │        │🦌Airdrop│       │🦌Treasury│    │
│    └─────────┘       └─────────┘        └─────────┘       └─────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Fee Collection**: Santa collects creator fees from pump.fun
2. **Market Data**: System fetches current price, volume, holder data
3. **AI Analysis**: Claude analyzes data and streams reasoning in real-time
4. **Decision**: AI outputs allocation percentages (must sum to 100%)
5. **Execution**: Fees distributed according to AI decision
6. **Dashboard**: Users see the entire thought process live

### Decision Strategies

| Market Condition | AI Reasoning | Likely Action |
|-----------------|--------------|---------------|
| Price dumping | Need buy pressure | **Buyback & Burn** |
| Price pumping | Reward holders | **Airdrop** |
| Low volume | Spark activity | **Volume Creation** |
| Healthy growth | Build reserves | **Treasury** |
| High volatility | Play it safe | **Treasury + Burn** |

---

## 2. Prerequisites

### Required API Keys

| Service | Purpose | How to Get |
|---------|---------|------------|
| Anthropic API | Claude AI decisions | https://console.anthropic.com |
| Birdeye API | Market analytics (optional) | https://birdeye.so/api |
| Helius API | Already have for RPC | Already configured |

### Dependencies to Install

```bash
npm install @anthropic-ai/sdk
```

### New Environment Variables

```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
BIRDEYE_API_KEY=xxxxx                    # Optional but recommended
AI_ENABLED=true                          # Toggle AI on/off
AI_MIN_DECISION_INTERVAL=60000           # Minimum ms between AI calls
```

---

## Phase 1: Type Definitions

### Create File: `src/ai/types.ts`

```typescript
/**
 * AI Decision Engine Type Definitions
 */

// ============================================
// MARKET DATA TYPES
// ============================================

/**
 * Complete market snapshot fed to Claude for analysis
 */
export interface MarketSnapshot {
  timestamp: Date;

  // Price metrics
  price: {
    current: number;          // Current price in USD
    change1h: number;         // % change in last hour
    change24h: number;        // % change in last 24 hours
    change7d: number;         // % change in last 7 days
    high24h: number;          // 24h high
    low24h: number;           // 24h low
  };

  // Volume metrics
  volume: {
    volume24h: number;        // Total 24h volume in USD
    volumeChange24h: number;  // % change in volume
    buyVolume24h: number;     // Buy-side volume
    sellVolume24h: number;    // Sell-side volume
    txCount24h: number;       // Transaction count
  };

  // Holder metrics
  holders: {
    total: number;            // Total holder count
    change24h: number;        // Change in holders (absolute)
    top10Percent: number;     // % held by top 10 wallets
    top20Percent: number;     // % held by top 20 wallets
  };

  // Bonding curve status
  bondingCurve: {
    progressPercent: number;  // Progress to graduation (0-100)
    virtualSolReserves: number;
    virtualTokenReserves: number;
    isComplete: boolean;      // Has graduated to Raydium
  };

  // Recent significant events
  recentEvents: MarketEvent[];
}

/**
 * Significant market events to inform AI decisions
 */
export interface MarketEvent {
  type: 'large_buy' | 'large_sell' | 'whale_movement' | 'holder_milestone' | 'volume_spike';
  description: string;
  timestamp: Date;
  magnitude: number;          // SOL amount or percentage
}

// ============================================
// AI DECISION TYPES
// ============================================

/**
 * Claude's complete decision output
 */
export interface AIDecision {
  // Allocation percentages (must sum to 100)
  allocation: {
    volume: number;           // % to volume creation
    buyback: number;          // % to buyback & burn
    airdrop: number;          // % to holder airdrops
    treasury: number;         // % to treasury
  };

  // Train of thought sections (displayed to users)
  reasoning: {
    marketAnalysis: string;   // What Claude sees in the data
    sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
    strategy: string;         // What approach and why
    risks: string;            // What could go wrong
    decision: string;         // Final summary
  };

  confidence: number;         // 0-100 confidence score
  priority: 'low' | 'medium' | 'high' | 'urgent';
  nextEvaluationMinutes: number;  // When to re-analyze
}

/**
 * Streamed thought chunks for real-time display
 */
export interface ThoughtChunk {
  section: 'market_analysis' | 'sentiment' | 'strategy' | 'risks' | 'decision' | 'allocation';
  content: string;            // The text chunk
  isComplete: boolean;        // Is this section complete?
  timestamp: Date;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Decision engine configuration
 */
export interface DecisionEngineConfig {
  anthropicApiKey: string;
  birdeyeApiKey?: string;
  enabled: boolean;
  minDecisionInterval: number;  // Minimum ms between decisions
  model: string;                // Claude model to use
  maxTokens: number;            // Max response tokens
}

/**
 * Default configuration values
 */
export const DEFAULT_AI_CONFIG: Partial<DecisionEngineConfig> = {
  enabled: true,
  minDecisionInterval: 60000,   // 1 minute
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2000,
};
```

### Create File: `src/ai/index.ts`

```typescript
/**
 * AI Module Exports
 */

export * from './types';
export { MarketDataCollector } from './marketDataCollector';
export { ClaudeClient } from './claudeClient';
export { DecisionEngine } from './decisionEngine';
```

---

## Phase 2: Market Data Collector

### Create File: `src/ai/marketDataCollector.ts`

```typescript
/**
 * Market Data Collector
 *
 * Aggregates market data from multiple sources:
 * - Jupiter: Real-time price
 * - Birdeye: Analytics, holder data, volume
 * - On-chain: Bonding curve status
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaService } from '../services/solanaService';
import { logger } from '../utils/logger';
import { MarketSnapshot, MarketEvent } from './types';

// API Endpoints
const JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';
const BIRDEYE_API = 'https://public-api.birdeye.so';

export class MarketDataCollector {
  private tokenAddress: PublicKey;
  private bondingCurveAddress: PublicKey;
  private solanaService: SolanaService;
  private birdeyeApiKey?: string;

  // Cache to avoid excessive API calls
  private cache: MarketSnapshot | null = null;
  private cacheExpiry: Date | null = null;
  private cacheDurationMs = 30000; // 30 second cache

  constructor(
    tokenAddress: PublicKey,
    bondingCurveAddress: PublicKey,
    solanaService: SolanaService,
    birdeyeApiKey?: string
  ) {
    this.tokenAddress = tokenAddress;
    this.bondingCurveAddress = bondingCurveAddress;
    this.solanaService = solanaService;
    this.birdeyeApiKey = birdeyeApiKey;

    logger.info('📊 Market Data Collector initialized', {
      token: tokenAddress.toString(),
      hasBirdeyeKey: !!birdeyeApiKey,
    });
  }

  /**
   * Collect all market data
   * Returns cached data if fresh, otherwise fetches new data
   */
  async collect(): Promise<MarketSnapshot> {
    // Return cached if still fresh
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      logger.debug('Returning cached market data');
      return this.cache;
    }

    logger.debug('Collecting fresh market data...');

    try {
      // Fetch all data sources in parallel for speed
      const [priceData, holderData, bondingCurve, recentEvents] = await Promise.all([
        this.fetchPriceAndVolume(),
        this.fetchHolderData(),
        this.fetchBondingCurveStatus(),
        this.fetchRecentEvents(),
      ]);

      const snapshot: MarketSnapshot = {
        timestamp: new Date(),
        price: {
          current: priceData.price,
          change1h: priceData.change1h,
          change24h: priceData.change24h,
          change7d: priceData.change7d,
          high24h: priceData.high24h,
          low24h: priceData.low24h,
        },
        volume: {
          volume24h: priceData.volume24h,
          volumeChange24h: priceData.volumeChange24h,
          buyVolume24h: priceData.buyVolume24h,
          sellVolume24h: priceData.sellVolume24h,
          txCount24h: priceData.txCount24h,
        },
        holders: holderData,
        bondingCurve,
        recentEvents,
      };

      // Cache the result
      this.cache = snapshot;
      this.cacheExpiry = new Date(Date.now() + this.cacheDurationMs);

      logger.info('📊 Market data collected', {
        price: snapshot.price.current.toFixed(8),
        change24h: `${snapshot.price.change24h.toFixed(2)}%`,
        volume24h: snapshot.volume.volume24h.toLocaleString(),
        holders: snapshot.holders.total,
        bondingProgress: `${snapshot.bondingCurve.progressPercent.toFixed(1)}%`,
      });

      return snapshot;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to collect market data', { error: errorMsg });

      // Return cached data if available, otherwise return defaults
      if (this.cache) {
        logger.warn('Returning stale cached data due to fetch error');
        return this.cache;
      }

      return this.getDefaultSnapshot();
    }
  }

  /**
   * Fetch price and volume data from Jupiter + Birdeye
   */
  private async fetchPriceAndVolume(): Promise<{
    price: number;
    change1h: number;
    change24h: number;
    change7d: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    volumeChange24h: number;
    buyVolume24h: number;
    sellVolume24h: number;
    txCount24h: number;
  }> {
    let price = 0;
    let change1h = 0, change24h = 0, change7d = 0;
    let high24h = 0, low24h = 0;
    let volume24h = 0, volumeChange24h = 0;
    let buyVolume24h = 0, sellVolume24h = 0, txCount24h = 0;

    try {
      // Jupiter for current price
      const jupiterRes = await fetch(
        `${JUPITER_PRICE_API}?ids=${this.tokenAddress.toString()}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (jupiterRes.ok) {
        const jupiterData = await jupiterRes.json();
        price = jupiterData.data?.[this.tokenAddress.toString()]?.price || 0;
      }
    } catch (error) {
      logger.warn('Jupiter price fetch failed', { error });
    }

    // Birdeye for detailed analytics (if API key available)
    if (this.birdeyeApiKey) {
      try {
        const birdeyeRes = await fetch(
          `${BIRDEYE_API}/defi/token_overview?address=${this.tokenAddress.toString()}`,
          {
            headers: { 'X-API-KEY': this.birdeyeApiKey },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (birdeyeRes.ok) {
          const birdeyeData = await birdeyeRes.json();
          const data = birdeyeData.data;

          if (data) {
            // Use Birdeye price if Jupiter failed
            if (price === 0) price = data.price || 0;

            change1h = data.priceChange1hPercent || 0;
            change24h = data.priceChange24hPercent || 0;
            change7d = data.priceChange7dPercent || 0;
            high24h = data.high24h || price;
            low24h = data.low24h || price;
            volume24h = data.v24hUSD || 0;
            volumeChange24h = data.v24hChangePercent || 0;
            buyVolume24h = data.buy24h || 0;
            sellVolume24h = data.sell24h || 0;
            txCount24h = data.trade24h || 0;
          }
        }
      } catch (error) {
        logger.warn('Birdeye fetch failed', { error });
      }
    }

    return {
      price,
      change1h,
      change24h,
      change7d,
      high24h,
      low24h,
      volume24h,
      volumeChange24h,
      buyVolume24h,
      sellVolume24h,
      txCount24h,
    };
  }

  /**
   * Fetch holder statistics
   */
  private async fetchHolderData(): Promise<MarketSnapshot['holders']> {
    const defaults = { total: 0, change24h: 0, top10Percent: 0, top20Percent: 0 };

    if (!this.birdeyeApiKey) {
      return defaults;
    }

    try {
      const res = await fetch(
        `${BIRDEYE_API}/defi/token_holder_stat?address=${this.tokenAddress.toString()}`,
        {
          headers: { 'X-API-KEY': this.birdeyeApiKey },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        return {
          total: data.data?.holder || 0,
          change24h: data.data?.holderChange24h || 0,
          top10Percent: data.data?.top10HolderPercent || 0,
          top20Percent: data.data?.top20HolderPercent || 0,
        };
      }
    } catch (error) {
      logger.warn('Holder data fetch failed', { error });
    }

    return defaults;
  }

  /**
   * Fetch bonding curve status from on-chain
   */
  private async fetchBondingCurveStatus(): Promise<MarketSnapshot['bondingCurve']> {
    const defaults = {
      progressPercent: 0,
      virtualSolReserves: 0,
      virtualTokenReserves: 0,
      isComplete: false,
    };

    try {
      const connection = this.solanaService.getConnection();
      const accountInfo = await connection.getAccountInfo(this.bondingCurveAddress);

      if (!accountInfo) {
        return defaults;
      }

      // Decode bonding curve data
      const data = this.decodeBondingCurve(accountInfo.data);

      // Calculate progress percentage
      const INITIAL_VIRTUAL_SOL = 30 * LAMPORTS_PER_SOL;
      const GRADUATION_THRESHOLD = 85 * LAMPORTS_PER_SOL;
      const currentVirtualSol = data.virtualSolReserves;
      const progress = currentVirtualSol - INITIAL_VIRTUAL_SOL;
      const progressPercent = Math.min(100, Math.max(0, (progress / GRADUATION_THRESHOLD) * 100));

      return {
        progressPercent,
        virtualSolReserves: data.virtualSolReserves / LAMPORTS_PER_SOL,
        virtualTokenReserves: data.virtualTokenReserves,
        isComplete: data.complete,
      };

    } catch (error) {
      logger.warn('Bonding curve fetch failed', { error });
      return defaults;
    }
  }

  /**
   * Decode bonding curve account data
   */
  private decodeBondingCurve(data: Buffer): {
    virtualTokenReserves: number;
    virtualSolReserves: number;
    realTokenReserves: number;
    realSolReserves: number;
    tokenTotalSupply: number;
    complete: boolean;
  } {
    const DISCRIMINATOR_SIZE = 8;
    const BN_SIZE = 8;
    let offset = DISCRIMINATOR_SIZE;

    const readBN = () => {
      const value = data.readBigUInt64LE(offset);
      offset += BN_SIZE;
      return Number(value);
    };

    return {
      virtualTokenReserves: readBN(),
      virtualSolReserves: readBN(),
      realTokenReserves: readBN(),
      realSolReserves: readBN(),
      tokenTotalSupply: readBN(),
      complete: data[offset] === 1,
    };
  }

  /**
   * Fetch recent significant market events
   */
  private async fetchRecentEvents(): Promise<MarketEvent[]> {
    // TODO: Implement with Helius transaction history or webhooks
    // For now, return empty array
    return [];
  }

  /**
   * Get default snapshot when data unavailable
   */
  private getDefaultSnapshot(): MarketSnapshot {
    return {
      timestamp: new Date(),
      price: { current: 0, change1h: 0, change24h: 0, change7d: 0, high24h: 0, low24h: 0 },
      volume: { volume24h: 0, volumeChange24h: 0, buyVolume24h: 0, sellVolume24h: 0, txCount24h: 0 },
      holders: { total: 0, change24h: 0, top10Percent: 0, top20Percent: 0 },
      bondingCurve: { progressPercent: 0, virtualSolReserves: 0, virtualTokenReserves: 0, isComplete: false },
      recentEvents: [],
    };
  }

  /**
   * Clear cache to force fresh fetch
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = null;
  }
}
```

---

## Phase 3: Claude Client with Streaming

### Create File: `src/ai/claudeClient.ts`

```typescript
/**
 * Claude API Client
 *
 * Handles communication with Claude API including:
 * - Streaming responses for real-time thought display
 * - Prompt construction
 * - Response parsing
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { wsManager } from '../api/websocket/events';
import { AIDecision, ThoughtChunk, MarketSnapshot } from './types';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514', maxTokens = 2000) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;

    logger.info('🤖 Claude client initialized', { model });
  }

  /**
   * Analyze market data and return allocation decision
   * Streams "train of thought" to WebSocket in real-time
   */
  async analyzeAndDecide(
    marketData: MarketSnapshot,
    availableFunds: number,
    previousDecisions: AIDecision[] = []
  ): Promise<AIDecision> {
    const prompt = this.buildPrompt(marketData, availableFunds, previousDecisions);

    logger.info('🧠 Starting AI analysis...', {
      availableFunds: availableFunds.toFixed(4),
      price: marketData.price.current.toFixed(8),
    });

    // Notify dashboard that thinking has started
    wsManager.broadcastThoughtStart();

    let fullResponse = '';
    let currentSection = 'market_analysis';

    try {
      // Use streaming for real-time thought display
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
        system: this.getSystemPrompt(),
      });

      // Process each chunk as it arrives
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullResponse += text;

          // Detect which section we're in
          const detectedSection = this.detectSection(fullResponse);

          // If section changed, notify dashboard
          if (detectedSection !== currentSection) {
            currentSection = detectedSection;
            wsManager.broadcastThoughtSection(currentSection);
          }

          // Stream the chunk to dashboard
          wsManager.broadcastThoughtChunk({
            section: currentSection as ThoughtChunk['section'],
            content: text,
            isComplete: false,
            timestamp: new Date(),
          });
        }
      }

      // Parse the complete response into structured decision
      const decision = this.parseDecision(fullResponse);

      // Notify dashboard that thinking is complete
      wsManager.broadcastThoughtComplete(decision);

      logger.info('🧠 AI analysis complete', {
        allocation: decision.allocation,
        confidence: decision.confidence,
        sentiment: decision.reasoning.sentiment,
      });

      return decision;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Claude API error', { error: errorMsg });

      // Notify dashboard of error
      wsManager.broadcastThoughtError(errorMsg);

      // Return safe default allocation
      return this.getDefaultDecision();
    }
  }

  /**
   * System prompt that defines Claude's role and response format
   */
  private getSystemPrompt(): string {
    return `You are Frostbyte's AI Decision Engine - an expert crypto market analyst managing tokenomics for a Solana pump.fun token.

Your role is to analyze real-time market data and decide how to allocate collected creator fees across 4 strategies:

**Available Strategies:**
- **Volume (🦌 Reindeer 1)**: Create trading activity to boost visibility and liquidity. Good for stagnant markets.
- **Buyback & Burn (🦌 Reindeer 2)**: Buy tokens and burn them permanently (deflationary). Good for price support during dumps.
- **Airdrop (🦌 Reindeer 3)**: Distribute SOL rewards to token holders. Good for rewarding loyalty during pumps.
- **Treasury (🦌 Reindeer 4)**: Save funds for future operations. Good for uncertain times or building reserves.

**CRITICAL RULES:**
1. Your allocation percentages MUST sum to exactly 100%
2. Be decisive - avoid 25/25/25/25 splits unless truly uncertain
3. Explain your reasoning clearly - users see your thoughts in real-time
4. Consider: momentum, holder sentiment, volume trends, bonding curve progress
5. Be conservative during high volatility
6. Prioritize long-term token health over short-term pumps

**RESPONSE FORMAT (use these EXACT section headers):**

## Market Analysis
[2-4 sentences analyzing the current market conditions. What do you see in the data?]

## Sentiment
[ONE WORD ONLY: BULLISH, BEARISH, NEUTRAL, or VOLATILE]

## Strategy
[2-3 sentences explaining your strategic approach. Why this allocation?]

## Risks
[1-2 sentences on potential downsides or what could go wrong]

## Decision
[1-2 sentences summarizing your final decision]

## Allocation
Volume: [X]%
Buyback: [X]%
Airdrop: [X]%
Treasury: [X]%
Confidence: [0-100]%
Priority: [low/medium/high/urgent]
Re-evaluate: [X] minutes

**EXAMPLES:**

If price is dumping with high sell volume:
- Heavy Buyback (50-70%) to create buy pressure
- Some Treasury (20-30%) to preserve capital
- Minimal Volume/Airdrop

If price is pumping with new holders joining:
- Heavy Airdrop (40-50%) to reward holders
- Some Volume (20-30%) to maintain momentum
- Rest to Treasury

If market is dead/stagnant:
- Heavy Volume (50-60%) to create activity
- Some Buyback (20-30%) to support price
- Small Treasury reserve`;
  }

  /**
   * Build the analysis prompt with market data
   */
  private buildPrompt(
    market: MarketSnapshot,
    availableFunds: number,
    previousDecisions: AIDecision[]
  ): string {
    const buyRatio = market.volume.sellVolume24h > 0
      ? (market.volume.buyVolume24h / market.volume.sellVolume24h).toFixed(2)
      : 'N/A';

    const recentDecision = previousDecisions[previousDecisions.length - 1];

    return `Analyze this market data and decide how to allocate ${availableFunds.toFixed(4)} SOL in creator fees:

## Current Price Data
- **Current Price**: $${market.price.current.toFixed(10)}
- **1h Change**: ${this.formatChange(market.price.change1h)}
- **24h Change**: ${this.formatChange(market.price.change24h)}
- **7d Change**: ${this.formatChange(market.price.change7d)}
- **24h High**: $${market.price.high24h.toFixed(10)}
- **24h Low**: $${market.price.low24h.toFixed(10)}

## Volume Data
- **24h Volume**: $${market.volume.volume24h.toLocaleString()}
- **Volume Change (24h)**: ${this.formatChange(market.volume.volumeChange24h)}
- **Buy Volume**: $${market.volume.buyVolume24h.toLocaleString()}
- **Sell Volume**: $${market.volume.sellVolume24h.toLocaleString()}
- **Buy/Sell Ratio**: ${buyRatio}
- **Transactions (24h)**: ${market.volume.txCount24h.toLocaleString()}

## Holder Data
- **Total Holders**: ${market.holders.total.toLocaleString()}
- **Holder Change (24h)**: ${market.holders.change24h >= 0 ? '+' : ''}${market.holders.change24h}
- **Top 10 Wallets Hold**: ${market.holders.top10Percent.toFixed(1)}%
- **Top 20 Wallets Hold**: ${market.holders.top20Percent.toFixed(1)}%

## Bonding Curve Status
- **Progress to Graduation**: ${market.bondingCurve.progressPercent.toFixed(1)}%
- **Status**: ${market.bondingCurve.isComplete ? '✅ GRADUATED (on Raydium)' : '🔄 ACTIVE (on pump.fun)'}
- **Virtual SOL Reserves**: ${market.bondingCurve.virtualSolReserves.toFixed(2)} SOL

## Recent Events
${market.recentEvents.length > 0
  ? market.recentEvents.map(e => `- [${e.type}] ${e.description}`).join('\n')
  : '- No significant events in the last hour'}

${recentDecision ? `
## Previous Decision (${this.getTimeSince(previousDecisions.length > 0 ? new Date() : new Date())} ago)
- Allocation: Volume ${recentDecision.allocation.volume}% | Buyback ${recentDecision.allocation.buyback}% | Airdrop ${recentDecision.allocation.airdrop}% | Treasury ${recentDecision.allocation.treasury}%
- Sentiment was: ${recentDecision.reasoning.sentiment}
- Reasoning: "${recentDecision.reasoning.decision}"
` : '## Previous Decision\nThis is the first analysis for this session.'}

---

Now provide your analysis and allocation decision. Remember: your thoughts are displayed to users in real-time, so be clear and insightful.`;
  }

  /**
   * Format percentage change with sign and color hint
   */
  private formatChange(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Get human-readable time since
   */
  private getTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  }

  /**
   * Detect which section of the response we're currently in
   */
  private detectSection(text: string): string {
    const sections = [
      { marker: '## Allocation', name: 'allocation' },
      { marker: '## Decision', name: 'decision' },
      { marker: '## Risks', name: 'risks' },
      { marker: '## Strategy', name: 'strategy' },
      { marker: '## Sentiment', name: 'sentiment' },
      { marker: '## Market Analysis', name: 'market_analysis' },
    ];

    // Find the last section marker in the text
    let lastSection = 'market_analysis';
    let lastIndex = -1;

    for (const section of sections) {
      const index = text.lastIndexOf(section.marker);
      if (index > lastIndex) {
        lastIndex = index;
        lastSection = section.name;
      }
    }

    return lastSection;
  }

  /**
   * Parse Claude's response into structured AIDecision
   */
  private parseDecision(response: string): AIDecision {
    // Extract allocation percentages using regex
    const volumeMatch = response.match(/Volume:\s*(\d+)%/i);
    const buybackMatch = response.match(/Buyback:\s*(\d+)%/i);
    const airdropMatch = response.match(/Airdrop:\s*(\d+)%/i);
    const treasuryMatch = response.match(/Treasury:\s*(\d+)%/i);
    const confidenceMatch = response.match(/Confidence:\s*(\d+)%/i);
    const priorityMatch = response.match(/Priority:\s*(low|medium|high|urgent)/i);
    const reEvalMatch = response.match(/Re-evaluate:\s*(\d+)\s*minutes?/i);
    const sentimentMatch = response.match(/## Sentiment\s*\n\s*(BULLISH|BEARISH|NEUTRAL|VOLATILE)/i);

    // Helper to extract section content
    const extractSection = (name: string): string => {
      const regex = new RegExp(`## ${name}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
      const match = response.match(regex);
      return match ? match[1].trim() : '';
    };

    // Parse allocation
    let allocation = {
      volume: parseInt(volumeMatch?.[1] || '25'),
      buyback: parseInt(buybackMatch?.[1] || '25'),
      airdrop: parseInt(airdropMatch?.[1] || '25'),
      treasury: parseInt(treasuryMatch?.[1] || '25'),
    };

    // Normalize to 100% if needed
    const total = allocation.volume + allocation.buyback + allocation.airdrop + allocation.treasury;
    if (total !== 100 && total > 0) {
      const factor = 100 / total;
      allocation.volume = Math.round(allocation.volume * factor);
      allocation.buyback = Math.round(allocation.buyback * factor);
      allocation.airdrop = Math.round(allocation.airdrop * factor);
      // Ensure we hit exactly 100%
      allocation.treasury = 100 - allocation.volume - allocation.buyback - allocation.airdrop;
    }

    return {
      allocation,
      reasoning: {
        marketAnalysis: extractSection('Market Analysis'),
        sentiment: (sentimentMatch?.[1]?.toLowerCase() || 'neutral') as AIDecision['reasoning']['sentiment'],
        strategy: extractSection('Strategy'),
        risks: extractSection('Risks'),
        decision: extractSection('Decision'),
      },
      confidence: parseInt(confidenceMatch?.[1] || '70'),
      priority: (priorityMatch?.[1]?.toLowerCase() || 'medium') as AIDecision['priority'],
      nextEvaluationMinutes: parseInt(reEvalMatch?.[1] || '15'),
    };
  }

  /**
   * Default decision when AI fails
   */
  private getDefaultDecision(): AIDecision {
    return {
      allocation: { volume: 25, buyback: 25, airdrop: 25, treasury: 25 },
      reasoning: {
        marketAnalysis: 'AI analysis unavailable - using balanced default allocation.',
        sentiment: 'neutral',
        strategy: 'Default equal distribution across all strategies for safety.',
        risks: 'AI analysis failed; manual review recommended.',
        decision: 'Falling back to balanced 25/25/25/25 split until AI is restored.',
      },
      confidence: 50,
      priority: 'low',
      nextEvaluationMinutes: 5,
    };
  }
}
```

---

## Phase 4: Decision Engine

### Create File: `src/ai/decisionEngine.ts`

```typescript
/**
 * AI Decision Engine
 *
 * Main orchestrator that coordinates:
 * - Market data collection
 * - Claude analysis
 * - Decision history tracking
 * - Rate limiting
 */

import { PublicKey } from '@solana/web3.js';
import { MarketDataCollector } from './marketDataCollector';
import { ClaudeClient } from './claudeClient';
import { SolanaService } from '../services/solanaService';
import { logger } from '../utils/logger';
import { wsManager } from '../api/websocket/events';
import { AIDecision, MarketSnapshot, DecisionEngineConfig, DEFAULT_AI_CONFIG } from './types';

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private marketCollector: MarketDataCollector;
  private claudeClient: ClaudeClient;
  private solanaService: SolanaService;

  // State
  private decisionHistory: AIDecision[] = [];
  private lastDecisionTime: Date | null = null;
  private isProcessing = false;
  private lastMarketData: MarketSnapshot | null = null;

  constructor(
    tokenAddress: PublicKey,
    bondingCurveAddress: PublicKey,
    solanaService: SolanaService,
    config: Partial<DecisionEngineConfig>
  ) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_AI_CONFIG,
      ...config,
    } as DecisionEngineConfig;

    this.solanaService = solanaService;

    // Initialize market data collector
    this.marketCollector = new MarketDataCollector(
      tokenAddress,
      bondingCurveAddress,
      solanaService,
      this.config.birdeyeApiKey
    );

    // Initialize Claude client
    this.claudeClient = new ClaudeClient(
      this.config.anthropicApiKey,
      this.config.model,
      this.config.maxTokens
    );

    logger.info('🧠 AI Decision Engine initialized', {
      enabled: this.config.enabled,
      minInterval: `${this.config.minDecisionInterval / 1000}s`,
      model: this.config.model,
    });
  }

  /**
   * Main entry point - called when fees need to be distributed
   * Returns allocation percentages
   */
  async decide(availableFunds: number): Promise<{
    volume: number;
    buyback: number;
    airdrop: number;
    treasury: number;
  }> {
    // If AI is disabled, return default split
    if (!this.config.enabled) {
      logger.debug('AI disabled, using default 25/25/25/25 allocation');
      return { volume: 25, buyback: 25, airdrop: 25, treasury: 25 };
    }

    // Prevent concurrent AI calls
    if (this.isProcessing) {
      logger.warn('AI decision already in progress, using last allocation');
      return this.getLastAllocation();
    }

    // Rate limit - don't call AI too frequently
    if (this.lastDecisionTime) {
      const elapsed = Date.now() - this.lastDecisionTime.getTime();
      if (elapsed < this.config.minDecisionInterval) {
        const waitTime = Math.ceil((this.config.minDecisionInterval - elapsed) / 1000);
        logger.debug(`Rate limited, using last allocation (next decision in ${waitTime}s)`);
        return this.getLastAllocation();
      }
    }

    this.isProcessing = true;

    try {
      // Step 1: Collect market data
      logger.info('📊 Collecting market data for AI analysis...');
      const marketData = await this.marketCollector.collect();
      this.lastMarketData = marketData;

      // Broadcast market data to dashboard
      wsManager.broadcastMarketData(marketData);

      // Step 2: Get AI decision with streaming thoughts
      logger.info('🧠 Requesting AI decision...');
      const decision = await this.claudeClient.analyzeAndDecide(
        marketData,
        availableFunds,
        this.decisionHistory.slice(-5) // Provide last 5 decisions for context
      );

      // Step 3: Store decision in history
      this.decisionHistory.push(decision);
      this.lastDecisionTime = new Date();

      // Keep only last 100 decisions to manage memory
      if (this.decisionHistory.length > 100) {
        this.decisionHistory = this.decisionHistory.slice(-100);
      }

      // Step 4: Broadcast final decision to dashboard
      wsManager.broadcastAIDecision(decision);

      logger.info('✅ AI decision complete', {
        allocation: decision.allocation,
        confidence: `${decision.confidence}%`,
        sentiment: decision.reasoning.sentiment,
        nextEval: `${decision.nextEvaluationMinutes}min`,
      });

      return decision.allocation;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI decision failed', { error: errorMsg });

      // Notify dashboard
      wsManager.broadcastThoughtError(errorMsg);

      // Return last known good allocation or default
      return this.getLastAllocation();

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the last allocation (or default if none)
   */
  private getLastAllocation(): {
    volume: number;
    buyback: number;
    airdrop: number;
    treasury: number;
  } {
    if (this.decisionHistory.length > 0) {
      return { ...this.decisionHistory[this.decisionHistory.length - 1].allocation };
    }
    return { volume: 25, buyback: 25, airdrop: 25, treasury: 25 };
  }

  /**
   * Get full decision history
   */
  getDecisionHistory(): AIDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Get most recent decision
   */
  getLastDecision(): AIDecision | null {
    if (this.decisionHistory.length === 0) return null;
    return { ...this.decisionHistory[this.decisionHistory.length - 1] };
  }

  /**
   * Get last collected market data
   */
  getLastMarketData(): MarketSnapshot | null {
    return this.lastMarketData;
  }

  /**
   * Check if AI is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if currently processing
   */
  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Enable/disable AI decisions
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info(`AI Decision Engine ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Force refresh market data cache
   */
  refreshMarketData(): void {
    this.marketCollector.clearCache();
  }

  /**
   * Get stats for API/dashboard
   */
  getStats(): {
    enabled: boolean;
    totalDecisions: number;
    lastDecisionTime: Date | null;
    lastSentiment: string | null;
    lastConfidence: number | null;
    isProcessing: boolean;
  } {
    const lastDecision = this.getLastDecision();
    return {
      enabled: this.config.enabled,
      totalDecisions: this.decisionHistory.length,
      lastDecisionTime: this.lastDecisionTime,
      lastSentiment: lastDecision?.reasoning.sentiment || null,
      lastConfidence: lastDecision?.confidence || null,
      isProcessing: this.isProcessing,
    };
  }
}
```

---

## Phase 5: WebSocket Events

### Update File: `src/api/websocket/events.ts`

Add these new methods to the existing `WSManager` class:

```typescript
// Add these imports at the top
import { AIDecision, ThoughtChunk, MarketSnapshot } from '../../ai/types';

// Add these new message types to the WSMessage interface
export interface WSMessage {
  type:
    | 'connected'
    | 'fee_collected'
    | 'burn'
    | 'airdrop'
    | 'volume'
    | 'treasury'
    | 'error'
    | 'stats'
    // NEW: AI-related events
    | 'ai_thinking_start'
    | 'ai_thinking_section'
    | 'ai_thinking_chunk'
    | 'ai_thinking_complete'
    | 'ai_thinking_error'
    | 'ai_decision'
    | 'market_data';
  data: unknown;
  timestamp: string;
}

// Add these methods to the WSManager class:

/**
 * Notify clients that AI analysis has started
 */
broadcastThoughtStart(): void {
  this.broadcast({
    type: 'ai_thinking_start',
    data: {
      message: 'AI analysis starting...',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients of current thinking section
 */
broadcastThoughtSection(section: string): void {
  this.broadcast({
    type: 'ai_thinking_section',
    data: { section },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Stream a thought chunk to clients
 */
broadcastThoughtChunk(chunk: ThoughtChunk): void {
  this.broadcast({
    type: 'ai_thinking_chunk',
    data: chunk,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients that AI thinking is complete
 */
broadcastThoughtComplete(decision: AIDecision): void {
  this.broadcast({
    type: 'ai_thinking_complete',
    data: {
      decision,
      completedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients of AI error
 */
broadcastThoughtError(error: string): void {
  this.broadcast({
    type: 'ai_thinking_error',
    data: {
      error,
      message: 'AI analysis failed, using default allocation',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast final AI decision
 */
broadcastAIDecision(decision: AIDecision): void {
  this.broadcast({
    type: 'ai_decision',
    data: decision,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast market data snapshot
 */
broadcastMarketData(market: MarketSnapshot): void {
  this.broadcast({
    type: 'market_data',
    data: market,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Phase 6: Fee Collector Integration

### Update File: `src/modules/feeCollector.ts`

Add the DecisionEngine integration:

```typescript
// Add import at top
import { DecisionEngine } from '../ai/decisionEngine';

// Add to class properties
private decisionEngine?: DecisionEngine;

// Add setter method
/**
 * Connect AI Decision Engine for dynamic allocation
 */
setDecisionEngine(engine: DecisionEngine): void {
  this.decisionEngine = engine;
  logger.info('🧠 AI Decision Engine connected to Fee Collector');
}

// Modify the distributeFees method to use AI:
private async distributeFees(totalAmount: number): Promise<void> {
  // Get allocation percentages - either from AI or default config
  let percentages = this.config.distributionPercentages;

  // If AI Decision Engine is connected and enabled, get dynamic allocation
  if (this.decisionEngine && this.decisionEngine.isEnabled()) {
    try {
      logger.info('🧠 Requesting AI allocation decision...');
      const aiAllocation = await this.decisionEngine.decide(totalAmount);

      percentages = {
        volume: aiAllocation.volume,
        buyback: aiAllocation.buyback,
        airdrop: aiAllocation.airdrop,
        treasury: aiAllocation.treasury,
      };

      logger.info('🧠 Using AI-determined allocation', {
        volume: `${percentages.volume}%`,
        buyback: `${percentages.buyback}%`,
        airdrop: `${percentages.airdrop}%`,
        treasury: `${percentages.treasury}%`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('AI decision failed, using default percentages', { error: errorMsg });
      // Fall through to use config percentages
    }
  } else {
    logger.debug('Using configured static allocation', percentages);
  }

  // Calculate amounts based on percentages
  const amounts = {
    volume: totalAmount * (percentages.volume / 100),
    buyback: totalAmount * (percentages.buyback / 100),
    airdrop: totalAmount * (percentages.airdrop / 100),
    treasury: totalAmount * (percentages.treasury / 100),
  };

  // ... rest of existing distribution logic remains the same
```

---

## Phase 7: Main.ts Integration

### Update File: `src/main.ts`

Add the Decision Engine initialization:

```typescript
// Add import
import { DecisionEngine } from './ai/decisionEngine';

// Add to TokenomicsBot class properties
private decisionEngine?: DecisionEngine;

// In the initialize() method, after loading wallets and before creating feeCollector:

// Initialize AI Decision Engine (if configured)
if (config.anthropicApiKey) {
  this.decisionEngine = new DecisionEngine(
    tokenAddress,
    bondingCurveAddress,
    this.solanaService,
    {
      anthropicApiKey: config.anthropicApiKey,
      birdeyeApiKey: config.birdeyeApiKey,
      enabled: config.aiEnabled,
      minDecisionInterval: config.aiMinDecisionInterval,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 2000,
    }
  );
  logger.info('✅ AI Decision Engine initialized');
} else {
  logger.info('ℹ️ AI Decision Engine not configured (no API key)');
}

// After creating feeCollector, connect the decision engine:
if (this.decisionEngine) {
  this.feeCollector.setDecisionEngine(this.decisionEngine);
}

// Also add to statsService if you want AI stats in API:
statsService.setModules({
  feeCollector: this.feeCollector,
  volumeCreator: this.volumeCreator,
  buybackBurner: this.buybackBurner,
  airdropDistributor: this.airdropDistributor,
  decisionEngine: this.decisionEngine, // Add this
});
```

---

## Phase 8: Environment Configuration

### Update File: `src/config/env.ts`

Add the new AI-related environment variables:

```typescript
// Add to the config object:

// AI Decision Engine
anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
birdeyeApiKey: process.env.BIRDEYE_API_KEY || '',
aiEnabled: process.env.AI_ENABLED === 'true',
aiMinDecisionInterval: parseInt(process.env.AI_MIN_DECISION_INTERVAL || '60000', 10),

// Update validation if you want to require the API key:
// (optional - only if AI_ENABLED is true)
if (process.env.AI_ENABLED === 'true' && !process.env.ANTHROPIC_API_KEY) {
  logger.warn('AI_ENABLED is true but ANTHROPIC_API_KEY is not set');
}
```

### Update File: `.env.example`

Add the new variables:

```bash
# ============================================
# AI DECISION ENGINE
# ============================================
# Anthropic API key for Claude
# Get from: https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Birdeye API key for market analytics (optional but recommended)
# Get from: https://birdeye.so/api
BIRDEYE_API_KEY=

# Enable/disable AI decision making
# When false, uses static 25/25/25/25 allocation
AI_ENABLED=true

# Minimum interval between AI decisions (milliseconds)
# Prevents excessive API calls and costs
# Default: 60000 (1 minute)
AI_MIN_DECISION_INTERVAL=60000
```

---

## Phase 9: Dashboard - AI Brain Component

### Create File: `dashboard/components/AIBrain.tsx`

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

// Types
interface ThoughtSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  isActive: boolean;
  isComplete: boolean;
}

interface AIDecision {
  allocation: {
    volume: number;
    buyback: number;
    airdrop: number;
    treasury: number;
  };
  confidence: number;
  priority: string;
  nextEvaluationMinutes: number;
  reasoning: {
    sentiment: string;
    marketAnalysis: string;
    strategy: string;
    risks: string;
    decision: string;
  };
}

const INITIAL_SECTIONS: ThoughtSection[] = [
  { id: 'market_analysis', title: 'Market Analysis', icon: '📊', content: '', isActive: false, isComplete: false },
  { id: 'sentiment', title: 'Sentiment', icon: '🎯', content: '', isActive: false, isComplete: false },
  { id: 'strategy', title: 'Strategy', icon: '♟️', content: '', isActive: false, isComplete: false },
  { id: 'risks', title: 'Risk Analysis', icon: '⚠️', content: '', isActive: false, isComplete: false },
  { id: 'decision', title: 'Decision', icon: '✅', content: '', isActive: false, isComplete: false },
];

export default function AIBrain() {
  const [isThinking, setIsThinking] = useState(false);
  const [sections, setSections] = useState<ThoughtSection[]>(INITIAL_SECTIONS);
  const [decision, setDecision] = useState<AIDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('AI Brain WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('AI Brain WebSocket disconnected');
    };

    ws.onerror = (err) => {
      console.error('AI Brain WebSocket error:', err);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWSMessage(message);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleWSMessage = (message: { type: string; data: unknown }) => {
    switch (message.type) {
      case 'ai_thinking_start':
        setIsThinking(true);
        setError(null);
        setDecision(null);
        setSections(INITIAL_SECTIONS.map(s => ({ ...s, content: '', isActive: false, isComplete: false })));
        break;

      case 'ai_thinking_section':
        const sectionData = message.data as { section: string };
        setSections(prev => prev.map(s => ({
          ...s,
          isActive: s.id === sectionData.section,
          isComplete: s.isActive && s.id !== sectionData.section ? true : s.isComplete,
        })));
        break;

      case 'ai_thinking_chunk':
        const chunkData = message.data as { section: string; content: string };
        setSections(prev => prev.map(s =>
          s.id === chunkData.section
            ? { ...s, content: s.content + chunkData.content, isActive: true }
            : s
        ));
        // Auto-scroll to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
        break;

      case 'ai_thinking_complete':
        const completeData = message.data as { decision: AIDecision };
        setIsThinking(false);
        setDecision(completeData.decision);
        setSections(prev => prev.map(s => ({ ...s, isActive: false, isComplete: true })));
        break;

      case 'ai_thinking_error':
        const errorData = message.data as { error: string };
        setIsThinking(false);
        setError(errorData.error);
        break;

      case 'ai_decision':
        setDecision(message.data as AIDecision);
        break;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      case 'volatile': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return 'bg-green-500/20 border-green-500';
      case 'bearish': return 'bg-red-500/20 border-red-500';
      case 'volatile': return 'bg-yellow-500/20 border-yellow-500';
      default: return 'bg-gray-500/20 border-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const allocationBars = [
    { key: 'volume', label: '🦌 Volume', color: 'bg-blue-500' },
    { key: 'buyback', label: '🔥 Buyback & Burn', color: 'bg-orange-500' },
    { key: 'airdrop', label: '🎁 Airdrop', color: 'bg-green-500' },
    { key: 'treasury', label: '🏦 Treasury', color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            !isConnected ? 'bg-red-500' :
            isThinking ? 'bg-blue-500 animate-pulse' :
            'bg-green-500'
          }`} />
          <h2 className="text-xl font-bold text-white">🧠 AI Decision Engine</h2>
        </div>
        <div className="flex items-center gap-3">
          {isThinking && (
            <span className="text-blue-400 text-sm animate-pulse flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </span>
          )}
          {!isConnected && (
            <span className="text-red-400 text-sm">Disconnected</span>
          )}
        </div>
      </div>

      {/* Thought Process */}
      <div ref={contentRef} className="p-6 max-h-[400px] overflow-y-auto space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`rounded-lg border transition-all duration-300 ${
              section.isActive
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : section.isComplete
                  ? 'border-gray-600 bg-gray-800/50'
                  : 'border-gray-700/50 bg-gray-800/30 opacity-40'
            }`}
          >
            <div className="px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
              <span className="text-lg">{section.icon}</span>
              <span className={`font-medium ${
                section.isActive ? 'text-blue-400' :
                section.isComplete ? 'text-gray-300' :
                'text-gray-500'
              }`}>
                {section.title}
              </span>
              {section.isActive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-blue-400">
                  <span className="animate-pulse">●</span>
                  thinking...
                </span>
              )}
              {section.isComplete && !section.isActive && (
                <span className="ml-auto text-xs text-green-400">✓</span>
              )}
            </div>
            {(section.content || section.isActive) && (
              <div className="px-4 py-3 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {section.content}
                {section.isActive && <span className="animate-pulse text-blue-400">▌</span>}
              </div>
            )}
          </div>
        ))}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 text-red-400">
              <span>⚠️</span>
              <span className="font-medium">Analysis Error</span>
            </div>
            <p className="text-red-300 text-sm mt-2">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Using default 25/25/25/25 allocation</p>
          </div>
        )}

        {/* Idle State */}
        {!isThinking && !decision && !error && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">🧠</div>
            <p>Waiting for fee collection to trigger analysis...</p>
            <p className="text-sm mt-1">AI will analyze market conditions and decide allocation</p>
          </div>
        )}
      </div>

      {/* Decision Summary */}
      {decision && (
        <div className="border-t border-gray-700 p-6 bg-gradient-to-b from-gray-800/50 to-gray-900">
          {/* Header with sentiment and confidence */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Final Allocation</h3>
            <div className="flex items-center gap-3">
              {/* Sentiment Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSentimentBg(decision.reasoning.sentiment)}`}>
                <span className={getSentimentColor(decision.reasoning.sentiment)}>
                  {decision.reasoning.sentiment?.toUpperCase()}
                </span>
              </span>

              {/* Priority Badge */}
              <span className={`px-2 py-1 rounded text-xs text-white font-medium ${getPriorityColor(decision.priority)}`}>
                {decision.priority?.toUpperCase()}
              </span>

              {/* Confidence */}
              <div className="text-sm text-gray-400">
                Confidence: <span className="text-white font-bold">{decision.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Allocation Bars */}
          <div className="space-y-4">
            {allocationBars.map(({ key, label, color }) => {
              const value = decision.allocation[key as keyof typeof decision.allocation];
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-white font-bold text-lg">{value}%</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-1000 ease-out rounded-full`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next evaluation */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
            <span className="text-gray-500 text-sm">
              Next evaluation in <span className="text-gray-300">{decision.nextEvaluationMinutes} minutes</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 10: Dashboard - Market Overview Component

### Create File: `dashboard/components/MarketOverview.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

interface MarketData {
  timestamp: string;
  price: {
    current: number;
    change1h: number;
    change24h: number;
    change7d: number;
    high24h: number;
    low24h: number;
  };
  volume: {
    volume24h: number;
    volumeChange24h: number;
    buyVolume24h: number;
    sellVolume24h: number;
    txCount24h: number;
  };
  holders: {
    total: number;
    change24h: number;
    top10Percent: number;
    top20Percent: number;
  };
  bondingCurve: {
    progressPercent: number;
    isComplete: boolean;
  };
}

export default function MarketOverview() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'market_data') {
          setMarket(message.data);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Failed to parse market data:', err);
      }
    };

    return () => ws.close();
  }, []);

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    const colorClass = value >= 0 ? 'text-green-400' : 'text-red-400';
    return <span className={colorClass}>{sign}{value.toFixed(2)}%</span>;
  };

  const formatPrice = (value: number) => {
    if (value < 0.00001) return value.toExponential(4);
    if (value < 0.01) return value.toFixed(8);
    if (value < 1) return value.toFixed(6);
    return value.toFixed(4);
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (!market) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">📈 Market Overview</h2>
        <div className="text-center py-8 text-gray-500">
          <div className="animate-pulse">Waiting for market data...</div>
        </div>
      </div>
    );
  }

  const buyRatio = market.volume.buyVolume24h + market.volume.sellVolume24h > 0
    ? (market.volume.buyVolume24h / (market.volume.buyVolume24h + market.volume.sellVolume24h)) * 100
    : 50;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">📈 Market Overview</h2>
        {lastUpdate && (
          <span className="text-xs text-gray-500">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Price Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Price</p>
          <p className="text-2xl font-bold text-white">${formatPrice(market.price.current)}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">1h</span>
              {formatChange(market.price.change1h)}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">24h</span>
              {formatChange(market.price.change24h)}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">7d</span>
              {formatChange(market.price.change7d)}
            </div>
          </div>
        </div>

        {/* Volume Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">24h Volume</p>
          <p className="text-2xl font-bold text-white">{formatVolume(market.volume.volume24h)}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-400">Buy {buyRatio.toFixed(0)}%</span>
              <span className="text-red-400">Sell {(100 - buyRatio).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-red-500/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${buyRatio}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {market.volume.txCount24h.toLocaleString()} transactions
          </div>
        </div>

        {/* Holders Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Holders</p>
          <p className="text-2xl font-bold text-white">{market.holders.total.toLocaleString()}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">24h change</span>
              <span className={market.holders.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                {market.holders.change24h >= 0 ? '+' : ''}{market.holders.change24h}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Top 10 hold</span>
              <span className="text-gray-300">{market.holders.top10Percent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Bonding Curve Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Bonding Curve</p>
          <p className="text-2xl font-bold text-white">{market.bondingCurve.progressPercent.toFixed(1)}%</p>
          <div className="mt-2">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${market.bondingCurve.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className={market.bondingCurve.isComplete ? 'text-green-400' : 'text-yellow-400'}>
              {market.bondingCurve.isComplete ? '✅ Graduated' : '🔄 Active on pump.fun'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 11: Dashboard Page Integration

### Update File: `dashboard/app/page.tsx`

Add the new components to the main dashboard page:

```tsx
// Add imports
import AIBrain from '../components/AIBrain';
import MarketOverview from '../components/MarketOverview';

// In the page component, add the new sections:

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ... existing header ... */}

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Market Overview - Full Width */}
        <MarketOverview />

        {/* AI Brain - Full Width */}
        <AIBrain />

        {/* Existing components below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stats Cards */}
          {/* Activity Feed */}
          {/* etc */}
        </div>
      </div>
    </main>
  );
}
```

### Update File: `dashboard/.env.local`

```bash
# WebSocket URL for real-time updates
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# For production on Render:
# NEXT_PUBLIC_WS_URL=wss://your-app.onrender.com
```

---

## Phase 12: Testing

### Create File: `src/test-ai.ts`

```typescript
/**
 * Test script for AI Decision Engine
 */

import { PublicKey } from '@solana/web3.js';
import { config } from './config/env';
import { SolanaService } from './services/solanaService';
import { DecisionEngine } from './ai/decisionEngine';
import { logger } from './utils/logger';

async function testAI() {
  console.log('🧪 Testing AI Decision Engine...\n');

  // Initialize services
  const solanaService = new SolanaService(config.rpcEndpoint, config.rpcWebsocketEndpoint);

  const tokenAddress = new PublicKey(config.tokenAddress);
  const bondingCurveAddress = config.bondingCurveAddress
    ? new PublicKey(config.bondingCurveAddress)
    : new PublicKey('11111111111111111111111111111111');

  // Create decision engine
  const engine = new DecisionEngine(
    tokenAddress,
    bondingCurveAddress,
    solanaService,
    {
      anthropicApiKey: config.anthropicApiKey,
      birdeyeApiKey: config.birdeyeApiKey,
      enabled: true,
      minDecisionInterval: 0, // No rate limit for testing
    }
  );

  console.log('✅ Decision Engine initialized\n');

  // Test with mock funds
  const testAmount = 0.1; // 0.1 SOL

  console.log(`📊 Requesting AI decision for ${testAmount} SOL...\n`);
  console.log('─'.repeat(50));

  try {
    const allocation = await engine.decide(testAmount);

    console.log('\n' + '─'.repeat(50));
    console.log('\n✅ AI Decision Complete!\n');
    console.log('Allocation:');
    console.log(`  🦌 Volume:  ${allocation.volume}%`);
    console.log(`  🔥 Buyback: ${allocation.buyback}%`);
    console.log(`  🎁 Airdrop: ${allocation.airdrop}%`);
    console.log(`  🏦 Treasury: ${allocation.treasury}%`);

    const decision = engine.getLastDecision();
    if (decision) {
      console.log(`\nConfidence: ${decision.confidence}%`);
      console.log(`Sentiment: ${decision.reasoning.sentiment}`);
      console.log(`Priority: ${decision.priority}`);
      console.log(`Re-evaluate in: ${decision.nextEvaluationMinutes} minutes`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  console.log('\n🧪 Test complete!');
  process.exit(0);
}

testAI().catch(console.error);
```

### Add to `package.json`:

```json
{
  "scripts": {
    "test-ai": "ts-node src/test-ai.ts"
  }
}
```

### Run the test:

```bash
npm run test-ai
```

---

## API Reference

### New WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ai_thinking_start` | Server → Client | AI analysis has started |
| `ai_thinking_section` | Server → Client | Current section being analyzed |
| `ai_thinking_chunk` | Server → Client | Streamed text chunk |
| `ai_thinking_complete` | Server → Client | Analysis complete with decision |
| `ai_thinking_error` | Server → Client | Analysis failed |
| `ai_decision` | Server → Client | Final decision broadcast |
| `market_data` | Server → Client | Market snapshot |

### New REST Endpoints (Optional)

```
GET /api/ai/status     - Get AI engine status
GET /api/ai/history    - Get decision history
POST /api/ai/enable    - Enable AI decisions
POST /api/ai/disable   - Disable AI decisions
GET /api/market        - Get latest market data
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "AI disabled, using default allocation" | `AI_ENABLED=false` or no API key | Set `AI_ENABLED=true` and `ANTHROPIC_API_KEY` |
| "Rate limited, using last allocation" | Decisions too frequent | Wait for `AI_MIN_DECISION_INTERVAL` to pass |
| "Claude API error" | Invalid API key or quota exceeded | Check Anthropic console for key/billing |
| "No market data" | Birdeye API issues | Check `BIRDEYE_API_KEY` or remove for basic mode |
| Dashboard not updating | WebSocket disconnected | Check console for WS errors, verify URL |

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

Test Claude connection:
```bash
npm run test-ai
```

---

## Cost Considerations

### Claude API Costs (Approximate)

| Model | Input | Output | Per Decision (est.) |
|-------|-------|--------|---------------------|
| claude-sonnet-4-20250514 | $3/1M tokens | $15/1M tokens | ~$0.01-0.02 |
| claude-opus-4-20250514 | $15/1M tokens | $75/1M tokens | ~$0.05-0.10 |

### Recommendations

- Use `claude-sonnet-4-20250514` for production (best cost/quality ratio)
- Set `AI_MIN_DECISION_INTERVAL=60000` (1 minute) minimum
- Cache market data for 30 seconds to reduce redundant fetches
- Monitor usage in Anthropic console

---

## Checklist

- [ ] Install `@anthropic-ai/sdk` dependency
- [ ] Create `src/ai/` folder with all files
- [ ] Update `src/api/websocket/events.ts`
- [ ] Update `src/modules/feeCollector.ts`
- [ ] Update `src/main.ts`
- [ ] Update `src/config/env.ts`
- [ ] Update `.env` with API keys
- [ ] Create dashboard components
- [ ] Update dashboard page
- [ ] Test with `npm run test-ai`
- [ ] Deploy and monitor

---

## Next Steps After Implementation

1. **Fine-tune prompts** based on actual decision quality
2. **Add more market data sources** (DEXScreener, etc.)
3. **Implement decision history visualization** in dashboard
4. **Add alerts/notifications** for high-confidence decisions
5. **Consider A/B testing** AI vs static allocation

---

*Document Version: 1.0*
*Last Updated: January 2025*
