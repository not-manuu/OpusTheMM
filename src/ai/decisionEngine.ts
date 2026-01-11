/**
 * AI Decision Engine
 *
 * Main orchestrator that coordinates:
 * - Market data collection
 * - Claude analysis with streaming
 * - Decision history tracking
 * - Rate limiting
 * - WebSocket event broadcasting
 */

import { PublicKey } from '@solana/web3.js';
import { MarketDataCollector } from './marketDataCollector';
import { ClaudeClient } from './claudeClient';
import { SolanaService } from '../services/solanaService';
import { logger } from '../utils/logger';
import {
  AIDecision,
  MarketSnapshot,
  DecisionEngineConfig,
  DecisionEngineStats,
  DEFAULT_AI_CONFIG,
  AllocationPercentages,
  ThoughtChunk,
  ThoughtSectionName,
  ConsciousnessThought,
  MindStreamThought,
} from './types';

/**
 * Callbacks for broadcasting events to WebSocket/Dashboard
 */
export interface DecisionEngineCallbacks {
  onThinkingStart?: () => void;
  onThinkingSection?: (section: ThoughtSectionName) => void;
  onThinkingChunk?: (chunk: ThoughtChunk) => void;
  onThinkingComplete?: (decision: AIDecision) => void;
  onThinkingError?: (error: string) => void;
  onDecision?: (decision: AIDecision) => void;
  onMarketData?: (data: MarketSnapshot) => void;
  // Consciousness stream callbacks
  onConsciousness?: (thought: ConsciousnessThought) => void;
  onMindStream?: (thought: MindStreamThought) => void;
}

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private marketCollector: MarketDataCollector;
  private claudeClient: ClaudeClient;
  private callbacks: DecisionEngineCallbacks = {};

  // State
  private decisionHistory: AIDecision[] = [];
  private lastDecisionTime: Date | null = null;
  private lastMarketData: MarketSnapshot | null = null;
  private isProcessing = false;

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

    // Wire up Claude client callbacks to our callbacks
    this.claudeClient.setCallbacks({
      onThoughtChunk: (chunk) => this.callbacks.onThinkingChunk?.(chunk),
      onSectionChange: (section) => this.callbacks.onThinkingSection?.(section),
      onThinkingStart: () => this.callbacks.onThinkingStart?.(),
      onThinkingComplete: (decision) => this.callbacks.onThinkingComplete?.(decision),
      onThinkingError: (error) => this.callbacks.onThinkingError?.(error),
      onConsciousness: (thought) => this.callbacks.onConsciousness?.(thought),
      onMindStream: (thought) => this.callbacks.onMindStream?.(thought),
    });

    logger.info('🧠 AI Decision Engine initialized', {
      enabled: this.config.enabled,
      minInterval: `${this.config.minDecisionInterval / 1000}s`,
      model: this.config.model,
    });
  }

  /**
   * Set callbacks for event broadcasting (WebSocket integration)
   */
  setCallbacks(callbacks: DecisionEngineCallbacks): void {
    this.callbacks = callbacks;

    // Update Claude client callbacks
    this.claudeClient.setCallbacks({
      onThoughtChunk: (chunk) => this.callbacks.onThinkingChunk?.(chunk),
      onSectionChange: (section) => this.callbacks.onThinkingSection?.(section),
      onThinkingStart: () => this.callbacks.onThinkingStart?.(),
      onThinkingComplete: (decision) => this.callbacks.onThinkingComplete?.(decision),
      onThinkingError: (error) => this.callbacks.onThinkingError?.(error),
      onConsciousness: (thought) => this.callbacks.onConsciousness?.(thought),
      onMindStream: (thought) => this.callbacks.onMindStream?.(thought),
    });
  }

  /**
   * Main entry point - called when fees need to be distributed
   * Returns allocation percentages
   */
  async decide(availableFunds: number): Promise<AllocationPercentages> {
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
      this.callbacks.onMarketData?.(marketData);

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
      this.callbacks.onDecision?.(decision);

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

      // Notify dashboard of error
      this.callbacks.onThinkingError?.(errorMsg);

      // Return last known good allocation or default
      return this.getLastAllocation();

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the last allocation (or default if none)
   */
  private getLastAllocation(): AllocationPercentages {
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
    logger.info(`🧠 AI Decision Engine ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Force refresh market data cache
   */
  refreshMarketData(): void {
    this.marketCollector.clearCache();
    logger.debug('Market data cache refreshed');
  }

  /**
   * Get statistics for API/dashboard
   */
  getStats(): DecisionEngineStats {
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

  /**
   * Test Claude API connection
   */
  async testConnection(): Promise<boolean> {
    return this.claudeClient.testConnection();
  }

  /**
   * Get time until next decision is allowed (ms)
   * Returns 0 if a decision can be made now
   */
  getTimeUntilNextDecision(): number {
    if (!this.lastDecisionTime) return 0;
    const elapsed = Date.now() - this.lastDecisionTime.getTime();
    const remaining = this.config.minDecisionInterval - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DecisionEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update Claude client model if changed
    if (newConfig.model) {
      this.claudeClient.setModel(newConfig.model);
    }

    logger.info('🧠 AI Decision Engine config updated', {
      enabled: this.config.enabled,
      minInterval: this.config.minDecisionInterval,
    });
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<DecisionEngineConfig, 'anthropicApiKey' | 'birdeyeApiKey'> {
    return {
      enabled: this.config.enabled,
      minDecisionInterval: this.config.minDecisionInterval,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
    };
  }

  /**
   * Manually trigger a decision (bypasses rate limiting)
   * Use with caution - intended for testing/admin purposes
   */
  async forceDecision(availableFunds: number): Promise<AllocationPercentages> {
    if (this.isProcessing) {
      throw new Error('Decision already in progress');
    }

    // Temporarily set last decision time to past to bypass rate limit
    const originalTime = this.lastDecisionTime;
    this.lastDecisionTime = null;

    try {
      return await this.decide(availableFunds);
    } finally {
      // If decision failed and we had no new time, restore original
      if (this.lastDecisionTime === null) {
        this.lastDecisionTime = originalTime;
      }
    }
  }

  /**
   * Clear decision history
   */
  clearHistory(): void {
    this.decisionHistory = [];
    this.lastDecisionTime = null;
    logger.info('🧠 AI Decision history cleared');
  }
}
