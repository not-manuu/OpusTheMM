/**
 * AI Decision Engine Type Definitions
 *
 * Types for market data, AI decisions, and configuration
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
 * Allocation percentages for fee distribution
 */
export interface AllocationPercentages {
  volume: number;             // % to volume creation
  buyback: number;            // % to buyback & burn
  airdrop: number;            // % to holder airdrops
  treasury: number;           // % to treasury
}

/**
 * Market sentiment as determined by AI
 */
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral' | 'volatile';

/**
 * Decision priority level
 */
export type DecisionPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * AI reasoning sections (displayed to users)
 */
export interface AIReasoning {
  marketAnalysis: string;     // What Claude sees in the data
  sentiment: MarketSentiment;
  strategy: string;           // What approach and why
  risks: string;              // What could go wrong
  decision: string;           // Final summary
}

/**
 * Claude's complete decision output
 */
export interface AIDecision {
  // Allocation percentages (must sum to 100)
  allocation: AllocationPercentages;

  // Train of thought sections (displayed to users)
  reasoning: AIReasoning;

  confidence: number;         // 0-100 confidence score
  priority: DecisionPriority;
  nextEvaluationMinutes: number;  // When to re-analyze
}

/**
 * Section names for streaming thoughts
 */
export type ThoughtSectionName =
  | 'market_analysis'
  | 'sentiment'
  | 'strategy'
  | 'risks'
  | 'decision'
  | 'allocation';

/**
 * Streamed thought chunks for real-time display
 */
export interface ThoughtChunk {
  section: ThoughtSectionName;
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

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Decision engine statistics
 */
export interface DecisionEngineStats {
  enabled: boolean;
  totalDecisions: number;
  lastDecisionTime: Date | null;
  lastSentiment: MarketSentiment | null;
  lastConfidence: number | null;
  isProcessing: boolean;
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

/**
 * AI-related WebSocket message types
 */
export type AIWebSocketMessageType =
  | 'ai_thinking_start'
  | 'ai_thinking_section'
  | 'ai_thinking_chunk'
  | 'ai_thinking_complete'
  | 'ai_thinking_error'
  | 'ai_decision'
  | 'market_data';

/**
 * WebSocket message for AI thinking start
 */
export interface AIThinkingStartMessage {
  type: 'ai_thinking_start';
  data: {
    message: string;
    timestamp: string;
  };
}

/**
 * WebSocket message for section change
 */
export interface AIThinkingSectionMessage {
  type: 'ai_thinking_section';
  data: {
    section: ThoughtSectionName;
  };
}

/**
 * WebSocket message for thought chunk
 */
export interface AIThinkingChunkMessage {
  type: 'ai_thinking_chunk';
  data: ThoughtChunk;
}

/**
 * WebSocket message for thinking complete
 */
export interface AIThinkingCompleteMessage {
  type: 'ai_thinking_complete';
  data: {
    decision: AIDecision;
    completedAt: string;
  };
}

/**
 * WebSocket message for thinking error
 */
export interface AIThinkingErrorMessage {
  type: 'ai_thinking_error';
  data: {
    error: string;
    message: string;
  };
}

/**
 * WebSocket message for AI decision
 */
export interface AIDecisionMessage {
  type: 'ai_decision';
  data: AIDecision;
}

/**
 * WebSocket message for market data
 */
export interface MarketDataMessage {
  type: 'market_data';
  data: MarketSnapshot;
}

/**
 * Union type for all AI WebSocket messages
 */
export type AIWebSocketMessage =
  | AIThinkingStartMessage
  | AIThinkingSectionMessage
  | AIThinkingChunkMessage
  | AIThinkingCompleteMessage
  | AIThinkingErrorMessage
  | AIDecisionMessage
  | MarketDataMessage;

// ============================================
// CONSCIOUSNESS STREAM TYPES
// ============================================

/**
 * Types of consciousness thoughts (like internal monologue)
 */
export type ConsciousnessType =
  | 'OBSERVING'   // Noticing something in the data
  | 'THINKING'    // Internal reasoning
  | 'ANALYZING'   // Deep analysis
  | 'DECIDING'    // Making a choice
  | 'EMOTIONS'    // Feeling/sentiment reaction
  | 'IDEA'        // New insight or realization
  | 'TRADE'       // Trade-related action
  | 'SYSTEM';     // System status

/**
 * A single consciousness thought entry
 */
export interface ConsciousnessThought {
  id: string;
  type: ConsciousnessType;
  message: string;
  timestamp: Date;
  intensity?: number;        // 0-1 for emotions
  metadata?: Record<string, unknown>;
}

/**
 * Categorized thought for mind stream display
 */
export interface MindStreamThought {
  id: string;
  type: 'IDEA' | 'THOUGHT' | 'OBSERVATION';
  content: string;
  timestamp: Date;
}

/**
 * WebSocket message for consciousness thought
 */
export interface ConsciousnessMessage {
  type: 'consciousness';
  data: ConsciousnessThought;
}

/**
 * WebSocket message for mind stream thought
 */
export interface MindStreamMessage {
  type: 'mind_stream';
  data: MindStreamThought;
}
