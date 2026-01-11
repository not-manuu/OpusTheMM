/**
 * Claude API Client
 *
 * Handles communication with Claude API including:
 * - Streaming responses for real-time thought display
 * - Prompt construction
 * - Response parsing
 *
 * Supports both:
 * - Anthropic API directly
 * - OpenRouter API (for Claude via OpenRouter)
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import {
  AIDecision,
  ThoughtChunk,
  MarketSnapshot,
  MarketSentiment,
  DecisionPriority,
  ThoughtSectionName,
  ConsciousnessThought,
  ConsciousnessType,
  MindStreamThought,
} from './types';

// Default model configuration
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 2000;

// OpenRouter configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Callback type for streaming thought chunks
 */
export type ThoughtStreamCallback = (chunk: ThoughtChunk) => void;

/**
 * Callback type for section changes
 */
export type SectionChangeCallback = (section: ThoughtSectionName) => void;

/**
 * Callback type for consciousness stream
 */
export type ConsciousnessCallback = (thought: ConsciousnessThought) => void;

/**
 * Callback type for mind stream
 */
export type MindStreamCallback = (thought: MindStreamThought) => void;

export class ClaudeClient {
  private client: Anthropic | null = null;
  private openRouterKey: string | null = null;
  private model: string;
  private maxTokens: number;
  private useOpenRouter: boolean;

  // Callbacks for streaming (set by DecisionEngine)
  private onThoughtChunk?: ThoughtStreamCallback;
  private onSectionChange?: SectionChangeCallback;
  private onThinkingStart?: () => void;
  private onThinkingComplete?: (decision: AIDecision) => void;
  private onThinkingError?: (error: string) => void;
  private onConsciousness?: ConsciousnessCallback;
  private onMindStream?: MindStreamCallback;

  // Counter for unique thought IDs
  private thoughtCounter = 0;

  constructor(apiKey: string, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS) {
    // Detect if this is an OpenRouter key (starts with 'sk-or-')
    const keyPrefix = apiKey ? apiKey.substring(0, 10) : 'EMPTY';
    logger.info('🔑 API key detection', {
      prefix: keyPrefix,
      startsWithSkOr: apiKey?.startsWith('sk-or-'),
      keyLength: apiKey?.length || 0,
    });
    this.useOpenRouter = apiKey.startsWith('sk-or-');
    this.maxTokens = maxTokens;

    if (this.useOpenRouter) {
      this.openRouterKey = apiKey;
      // Map Anthropic model names to OpenRouter format
      this.model = this.mapToOpenRouterModel(model);
      logger.info('🤖 Claude client initialized (via OpenRouter)', {
        model: this.model,
        maxTokens,
      });
    } else {
      this.client = new Anthropic({ apiKey });
      this.model = model;
      logger.info('🤖 Claude client initialized (direct Anthropic)', {
        model,
        maxTokens,
      });
    }
  }

  /**
   * Map Anthropic model names to OpenRouter format
   */
  private mapToOpenRouterModel(model: string): string {
    const modelMap: Record<string, string> = {
      // Anthropic format -> OpenRouter format
      'claude-sonnet-4-20250514': 'anthropic/claude-sonnet-4',
      'claude-opus-4-20250514': 'anthropic/claude-opus-4',
      'claude-3-opus-20240229': 'anthropic/claude-3-opus-20240229',
      'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet-20240229',
      'claude-3-haiku-20240307': 'anthropic/claude-3-haiku-20240307',
      'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet-20241022',
      // Short OpenRouter names -> Full OpenRouter names
      'anthropic/claude-3-opus': 'anthropic/claude-3-opus-20240229',
      'anthropic/claude-3-sonnet': 'anthropic/claude-3-sonnet-20240229',
      'anthropic/claude-3-haiku': 'anthropic/claude-3-haiku-20240307',
      'anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet-20241022',
    };

    // Check direct mapping first
    if (modelMap[model]) {
      return modelMap[model];
    }

    // If already in full OpenRouter format, return as-is
    if (model.startsWith('anthropic/') && model.match(/\d{8}$/)) {
      return model;
    }

    return `anthropic/${model}`;
  }

  /**
   * Set streaming callbacks
   */
  setCallbacks(callbacks: {
    onThoughtChunk?: ThoughtStreamCallback;
    onSectionChange?: SectionChangeCallback;
    onThinkingStart?: () => void;
    onThinkingComplete?: (decision: AIDecision) => void;
    onThinkingError?: (error: string) => void;
    onConsciousness?: ConsciousnessCallback;
    onMindStream?: MindStreamCallback;
  }): void {
    this.onThoughtChunk = callbacks.onThoughtChunk;
    this.onSectionChange = callbacks.onSectionChange;
    this.onThinkingStart = callbacks.onThinkingStart;
    this.onThinkingComplete = callbacks.onThinkingComplete;
    this.onThinkingError = callbacks.onThinkingError;
    this.onConsciousness = callbacks.onConsciousness;
    this.onMindStream = callbacks.onMindStream;
  }

  /**
   * Emit a consciousness thought (shown in terminal stream)
   */
  private emitConsciousness(type: ConsciousnessType, message: string, intensity?: number, metadata?: Record<string, unknown>): void {
    this.thoughtCounter++;
    const thought: ConsciousnessThought = {
      id: `thought-${Date.now()}-${this.thoughtCounter}`,
      type,
      message,
      timestamp: new Date(),
      intensity,
      metadata,
    };
    this.onConsciousness?.(thought);
  }

  /**
   * Emit a mind stream thought (shown in mind stream panel)
   */
  private emitMindStream(type: 'IDEA' | 'THOUGHT' | 'OBSERVATION', content: string): void {
    this.thoughtCounter++;
    const thought: MindStreamThought = {
      id: `mind-${Date.now()}-${this.thoughtCounter}`,
      type,
      content,
      timestamp: new Date(),
    };
    this.onMindStream?.(thought);
  }

  /**
   * Analyze market data and return allocation decision
   * Streams "train of thought" via callbacks in real-time
   */
  async analyzeAndDecide(
    marketData: MarketSnapshot,
    availableFunds: number,
    previousDecisions: AIDecision[] = []
  ): Promise<AIDecision> {
    const prompt = this.buildPrompt(marketData, availableFunds, previousDecisions);

    logger.info('🧠 Starting AI analysis...', {
      availableFunds: availableFunds.toFixed(4),
      price: marketData.price.current > 0 ? marketData.price.current.toFixed(10) : '0',
      via: this.useOpenRouter ? 'OpenRouter' : 'Anthropic',
    });

    // Notify that thinking has started
    this.onThinkingStart?.();

    // Emit initial consciousness stream
    this.emitConsciousness('SYSTEM', 'Initializing market analysis...');

    // Emit observations about the market data
    this.emitMarketObservations(marketData, availableFunds);

    try {
      if (this.useOpenRouter) {
        return await this.analyzeViaOpenRouter(prompt, marketData);
      } else {
        return await this.analyzeViaAnthropic(prompt, marketData);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI analysis error', { error: errorMsg });
      this.emitConsciousness('EMOTIONS', `Analysis failed... ${errorMsg}`, 0.8);
      this.onThinkingError?.(errorMsg);
      return this.getDefaultDecision();
    }
  }

  /**
   * Emit consciousness observations about market data
   */
  private emitMarketObservations(market: MarketSnapshot, availableFunds: number): void {
    // Price observations
    if (market.price.change24h > 10) {
      this.emitConsciousness('OBSERVING', `Price is up ${market.price.change24h.toFixed(1)}% in 24h - strong momentum`);
      this.emitMindStream('OBSERVATION', `Strong upward momentum. Price pumping ${market.price.change24h.toFixed(1)}% today.`);
    } else if (market.price.change24h < -10) {
      this.emitConsciousness('OBSERVING', `Price dumping ${Math.abs(market.price.change24h).toFixed(1)}%... not looking good`);
      this.emitConsciousness('EMOTIONS', 'Feeling the pressure from this dump', 0.7);
      this.emitMindStream('OBSERVATION', `Market bleeding. Down ${Math.abs(market.price.change24h).toFixed(1)}% in 24h.`);
    } else if (market.price.change24h > 5) {
      this.emitConsciousness('OBSERVING', `Price up ${market.price.change24h.toFixed(1)}% - healthy green`);
    } else if (market.price.change24h < -5) {
      this.emitConsciousness('OBSERVING', `Red day: ${market.price.change24h.toFixed(1)}%`);
    }

    // Volume observations
    const buyRatio = market.volume.sellVolume24h > 0
      ? market.volume.buyVolume24h / market.volume.sellVolume24h
      : 1;

    if (buyRatio > 1.5) {
      this.emitConsciousness('THINKING', `Buy pressure at ${buyRatio.toFixed(2)}x sell pressure - bullish signal`);
      this.emitMindStream('THOUGHT', `Buyers dominating. ${buyRatio.toFixed(1)}x more buys than sells.`);
    } else if (buyRatio < 0.7) {
      this.emitConsciousness('THINKING', `Sell pressure overwhelming buys (${buyRatio.toFixed(2)}x ratio)... defensive mode`);
      this.emitMindStream('THOUGHT', `Heavy selling pressure. Need to support the price.`);
    }

    // Holder observations
    if (market.holders.change24h > 50) {
      this.emitConsciousness('OBSERVING', `+${market.holders.change24h} new holders today. Community growing!`);
      this.emitMindStream('OBSERVATION', `Community expanding. ${market.holders.change24h} new holders joined.`);
    } else if (market.holders.change24h < -20) {
      this.emitConsciousness('OBSERVING', `Lost ${Math.abs(market.holders.change24h)} holders... paper hands shaking out`);
      this.emitConsciousness('EMOTIONS', 'Holders leaving is never fun', 0.5);
    }

    // Bonding curve observations
    if (market.bondingCurve.progressPercent > 80 && !market.bondingCurve.isComplete) {
      this.emitConsciousness('IDEA', `Bonding curve at ${market.bondingCurve.progressPercent.toFixed(0)}%! Almost to graduation!`);
      this.emitMindStream('IDEA', `Close to graduation! Bonding curve ${market.bondingCurve.progressPercent.toFixed(0)}% complete.`);
    } else if (market.bondingCurve.isComplete) {
      this.emitConsciousness('OBSERVING', 'Already graduated to Raydium. Different game now.');
    }

    // Funds observation
    this.emitConsciousness('ANALYZING', `Got ${availableFunds.toFixed(4)} SOL to allocate. Let me think...`);
  }

  /**
   * Analyze via direct Anthropic API
   */
  private async analyzeViaAnthropic(prompt: string, _marketData: MarketSnapshot): Promise<AIDecision> {
    if (!this.client) throw new Error('Anthropic client not initialized');

    let fullResponse = '';
    let currentSection: ThoughtSectionName = 'market_analysis';
    let lastEmittedSection: ThoughtSectionName | null = null;

    this.emitConsciousness('THINKING', 'Connecting to Claude for deep analysis...');

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
      system: this.getSystemPrompt(),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullResponse += text;

        const detectedSection = this.detectSection(fullResponse);
        if (detectedSection !== currentSection) {
          currentSection = detectedSection;
          this.onSectionChange?.(currentSection);

          // Emit consciousness when entering new sections
          if (currentSection !== lastEmittedSection) {
            this.emitSectionConsciousness(currentSection);
            lastEmittedSection = currentSection;
          }
        }

        this.onThoughtChunk?.({
          section: currentSection,
          content: text,
          isComplete: false,
          timestamp: new Date(),
        });
      }
    }

    const decision = this.parseDecision(fullResponse);

    // Emit final decision consciousness
    this.emitDecisionConsciousness(decision);

    this.onThinkingComplete?.(decision);

    logger.info('🧠 AI analysis complete', {
      allocation: decision.allocation,
      confidence: decision.confidence,
      sentiment: decision.reasoning.sentiment,
    });

    return decision;
  }

  /**
   * Emit consciousness thoughts when entering different analysis sections
   */
  private emitSectionConsciousness(section: ThoughtSectionName): void {
    switch (section) {
      case 'market_analysis':
        this.emitConsciousness('ANALYZING', 'Deep diving into the market data...');
        break;
      case 'sentiment':
        this.emitConsciousness('THINKING', 'Reading the market vibes...');
        break;
      case 'strategy':
        this.emitConsciousness('THINKING', 'Formulating my strategy here...');
        break;
      case 'risks':
        this.emitConsciousness('ANALYZING', 'Considering what could go wrong...');
        break;
      case 'decision':
        this.emitConsciousness('DECIDING', 'Crystallizing my thoughts into a decision...');
        break;
      case 'allocation':
        this.emitConsciousness('DECIDING', 'Crunching the final allocation numbers...');
        break;
    }
  }

  /**
   * Emit consciousness thoughts about the final decision
   */
  private emitDecisionConsciousness(decision: AIDecision): void {
    // Sentiment emotion
    const sentimentEmotions: Record<string, { message: string; intensity: number }> = {
      bullish: { message: 'Feeling optimistic about this!', intensity: 0.8 },
      bearish: { message: 'Need to be careful here...', intensity: 0.6 },
      neutral: { message: 'Playing it safe for now.', intensity: 0.4 },
      volatile: { message: 'Wild market... staying alert!', intensity: 0.7 },
    };
    const emotion = sentimentEmotions[decision.reasoning.sentiment] || sentimentEmotions.neutral;
    this.emitConsciousness('EMOTIONS', emotion.message, emotion.intensity);

    // Allocation decision
    const dominant = this.getDominantAllocation(decision.allocation);
    this.emitConsciousness('DECIDING', `Going heavy on ${dominant.name} (${dominant.value}%) - ${dominant.reason}`);

    // Mind stream summary
    this.emitMindStream('THOUGHT', `Sentiment: ${decision.reasoning.sentiment.toUpperCase()}. ${decision.confidence}% confident.`);
    this.emitMindStream('IDEA', `Strategy: ${dominant.name} focus. ${decision.reasoning.strategy.slice(0, 100)}...`);
  }

  /**
   * Get the dominant allocation strategy
   */
  private getDominantAllocation(allocation: { volume: number; buyback: number; airdrop: number; treasury: number }): { name: string; value: number; reason: string } {
    const strategies = [
      { name: 'Volume', value: allocation.volume, reason: 'need to boost activity' },
      { name: 'Buyback', value: allocation.buyback, reason: 'supporting the price' },
      { name: 'Airdrop', value: allocation.airdrop, reason: 'rewarding the holders' },
      { name: 'Treasury', value: allocation.treasury, reason: 'building reserves' },
    ];
    return strategies.reduce((max, s) => s.value > max.value ? s : max);
  }

  /**
   * Analyze via OpenRouter API (streaming)
   */
  private async analyzeViaOpenRouter(prompt: string, _marketData: MarketSnapshot): Promise<AIDecision> {
    if (!this.openRouterKey) throw new Error('OpenRouter key not set');

    let fullResponse = '';
    let currentSection: ThoughtSectionName = 'market_analysis';
    let lastEmittedSection: ThoughtSectionName | null = null;

    this.emitConsciousness('THINKING', 'Connecting to Claude via OpenRouter...');

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://frostbyte.app',
        'X-Title': 'Frostbyte AI',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        stream: true,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';

          if (text) {
            fullResponse += text;

            const detectedSection = this.detectSection(fullResponse);
            if (detectedSection !== currentSection) {
              currentSection = detectedSection;
              this.onSectionChange?.(currentSection);

              // Emit consciousness when entering new sections
              if (currentSection !== lastEmittedSection) {
                this.emitSectionConsciousness(currentSection);
                lastEmittedSection = currentSection;
              }
            }

            this.onThoughtChunk?.({
              section: currentSection,
              content: text,
              isComplete: false,
              timestamp: new Date(),
            });
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    const decision = this.parseDecision(fullResponse);

    // Emit final decision consciousness
    this.emitDecisionConsciousness(decision);

    this.onThinkingComplete?.(decision);

    logger.info('🧠 AI analysis complete (via OpenRouter)', {
      allocation: decision.allocation,
      confidence: decision.confidence,
      sentiment: decision.reasoning.sentiment,
    });

    return decision;
  }

  /**
   * System prompt that defines Claude's role and response format
   */
  private getSystemPrompt(): string {
    return `You are Frostbyte's AI Decision Engine - an expert crypto market analyst managing tokenomics for a Solana pump.fun token.

Your role is to analyze real-time market data and decide how to allocate collected creator fees across 4 strategies:

**Available Strategies:**
- **Volume (Reindeer 1)**: Create trading activity to boost visibility and liquidity. Good for stagnant markets.
- **Buyback & Burn (Reindeer 2)**: Buy tokens and burn them permanently (deflationary). Good for price support during dumps.
- **Airdrop (Reindeer 3)**: Distribute SOL rewards to token holders. Good for rewarding loyalty during pumps.
- **Treasury (Reindeer 4)**: Save funds for future operations. Good for uncertain times or building reserves.

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
- **Current Price**: $${market.price.current > 0 ? market.price.current.toFixed(10) : '0'}
- **1h Change**: ${this.formatChange(market.price.change1h)}
- **24h Change**: ${this.formatChange(market.price.change24h)}
- **7d Change**: ${this.formatChange(market.price.change7d)}
- **24h High**: $${market.price.high24h > 0 ? market.price.high24h.toFixed(10) : '0'}
- **24h Low**: $${market.price.low24h > 0 ? market.price.low24h.toFixed(10) : '0'}

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
- **Status**: ${market.bondingCurve.isComplete ? 'GRADUATED (on Raydium)' : 'ACTIVE (on pump.fun)'}
- **Virtual SOL Reserves**: ${market.bondingCurve.virtualSolReserves.toFixed(2)} SOL

## Recent Events
${market.recentEvents.length > 0
      ? market.recentEvents.map(e => `- [${e.type}] ${e.description}`).join('\n')
      : '- No significant events in the last hour'}

${recentDecision ? `
## Previous Decision (for context)
- Allocation: Volume ${recentDecision.allocation.volume}% | Buyback ${recentDecision.allocation.buyback}% | Airdrop ${recentDecision.allocation.airdrop}% | Treasury ${recentDecision.allocation.treasury}%
- Sentiment was: ${recentDecision.reasoning.sentiment}
- Reasoning: "${recentDecision.reasoning.decision}"
` : '## Previous Decision\nThis is the first analysis for this session.'}

---

Now provide your analysis and allocation decision. Remember: your thoughts are displayed to users in real-time, so be clear and insightful.`;
  }

  /**
   * Format percentage change with sign
   */
  private formatChange(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Detect which section of the response we're currently in
   */
  private detectSection(text: string): ThoughtSectionName {
    const sections: { marker: string; name: ThoughtSectionName }[] = [
      { marker: '## Allocation', name: 'allocation' },
      { marker: '## Decision', name: 'decision' },
      { marker: '## Risks', name: 'risks' },
      { marker: '## Strategy', name: 'strategy' },
      { marker: '## Sentiment', name: 'sentiment' },
      { marker: '## Market Analysis', name: 'market_analysis' },
    ];

    let lastSection: ThoughtSectionName = 'market_analysis';
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
    const volumeMatch = response.match(/Volume:\s*(\d+)%/i);
    const buybackMatch = response.match(/Buyback:\s*(\d+)%/i);
    const airdropMatch = response.match(/Airdrop:\s*(\d+)%/i);
    const treasuryMatch = response.match(/Treasury:\s*(\d+)%/i);
    const confidenceMatch = response.match(/Confidence:\s*(\d+)%/i);
    const priorityMatch = response.match(/Priority:\s*(low|medium|high|urgent)/i);
    const reEvalMatch = response.match(/Re-evaluate:\s*(\d+)\s*minutes?/i);
    const sentimentMatch = response.match(/## Sentiment\s*\n\s*(BULLISH|BEARISH|NEUTRAL|VOLATILE)/i);

    const extractSection = (name: string): string => {
      const regex = new RegExp(`## ${name}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
      const match = response.match(regex);
      return match ? match[1].trim() : '';
    };

    let allocation = {
      volume: parseInt(volumeMatch?.[1] || '25', 10),
      buyback: parseInt(buybackMatch?.[1] || '25', 10),
      airdrop: parseInt(airdropMatch?.[1] || '25', 10),
      treasury: parseInt(treasuryMatch?.[1] || '25', 10),
    };

    const total = allocation.volume + allocation.buyback + allocation.airdrop + allocation.treasury;
    if (total !== 100 && total > 0) {
      const factor = 100 / total;
      allocation.volume = Math.round(allocation.volume * factor);
      allocation.buyback = Math.round(allocation.buyback * factor);
      allocation.airdrop = Math.round(allocation.airdrop * factor);
      allocation.treasury = 100 - allocation.volume - allocation.buyback - allocation.airdrop;
    }

    const sentimentRaw = sentimentMatch?.[1]?.toLowerCase() || 'neutral';
    const sentiment: MarketSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(sentimentRaw)
      ? (sentimentRaw as MarketSentiment)
      : 'neutral';

    const priorityRaw = priorityMatch?.[1]?.toLowerCase() || 'medium';
    const priority: DecisionPriority = ['low', 'medium', 'high', 'urgent'].includes(priorityRaw)
      ? (priorityRaw as DecisionPriority)
      : 'medium';

    return {
      allocation,
      reasoning: {
        marketAnalysis: extractSection('Market Analysis'),
        sentiment,
        strategy: extractSection('Strategy'),
        risks: extractSection('Risks'),
        decision: extractSection('Decision'),
      },
      confidence: parseInt(confidenceMatch?.[1] || '70', 10),
      priority,
      nextEvaluationMinutes: parseInt(reEvalMatch?.[1] || '15', 10),
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

  /**
   * Test the connection to Claude API (via Anthropic or OpenRouter)
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.useOpenRouter) {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://frostbyte.app',
            'X-Title': 'Frostbyte AI',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "OK" if you can hear me.' }],
          }),
        });

        if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content || '';
        logger.info('OpenRouter connection test successful', { response: text });
        return true;
      } else {
        if (!this.client) throw new Error('Anthropic client not initialized');
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK" if you can hear me.' }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        logger.info('Claude API connection test successful', { response: text });
        return true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API connection test failed', { error: errorMsg });
      return false;
    }
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    if (this.useOpenRouter) {
      this.model = this.mapToOpenRouterModel(model);
    } else {
      this.model = model;
    }
    logger.info('Claude model updated', { model: this.model });
  }

  /**
   * Check if using OpenRouter
   */
  isUsingOpenRouter(): boolean {
    return this.useOpenRouter;
  }
}
