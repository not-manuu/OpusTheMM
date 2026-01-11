// Stats types matching backend API
export interface FeeStats {
  totalCollected: number;
  claimCount: number;
  lastClaimTime: string | null;
  lastClaimAmount: number;
}

export interface VolumeStats {
  totalVolume: number;
  tradeCount: number;
  successfulTrades: number;
  failedTrades: number;
  lastTradeTime: string | null;
}

export interface BurnStats {
  totalBurned: number;
  totalSolSpent: number;
  burnCount: number;
  lastBurnTime: string | null;
}

export interface AirdropStats {
  totalDistributed: number;
  distributionCount: number;
  uniqueRecipients: number;
  lastDistributionTime: string | null;
}

export interface TreasuryStats {
  totalReceived: number;
  transferCount: number;
  lastTransferTime: string | null;
}

export interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;
  modules: {
    feeCollector: boolean;
    volumeCreator: boolean;
    buybackBurner: boolean;
    airdropDistributor: boolean;
  };
}

export interface ComprehensiveStats {
  fees: FeeStats;
  volume: VolumeStats;
  burns: BurnStats;
  airdrops: AirdropStats;
  treasury: TreasuryStats;
  distribution: {
    volume: string;
    buyback: string;
    airdrop: string;
    treasury: string;
  };
  status: BotStatus;
}

export interface WalletData {
  master: {
    address: string;
    balance: number;
    label: string;
  };
  reindeer: {
    volume: {
      label: string;
      emoji: string;
      totalBalance: number;
      wallets: Array<{ address: string; balance: number }>;
    };
    buyback: {
      label: string;
      emoji: string;
      address: string;
      balance: number;
    };
    airdrop: {
      label: string;
      emoji: string;
      address: string;
      balance: number;
      note?: string;
    };
    treasury: {
      label: string;
      emoji: string;
      address: string;
      balance: number;
    };
  };
}

// AI-related types
export type ThoughtSectionName =
  | 'market_analysis'
  | 'sentiment'
  | 'risk_assessment'
  | 'strategy'
  | 'allocation';

export interface ThoughtChunk {
  section: ThoughtSectionName;
  content: string;
  isComplete: boolean;
  timestamp: string;
}

export interface AllocationPercentages {
  volume: number;
  buyback: number;
  airdrop: number;
  treasury: number;
}

export interface AIReasoning {
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  marketCondition: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyFactors: string[];
  strategy: string;
}

export interface AIDecision {
  allocation: AllocationPercentages;
  reasoning: AIReasoning;
  confidence: number;
  priority: 'volume' | 'stability' | 'growth' | 'defense';
  nextEvaluationMinutes: number;
}

export interface MarketSnapshot {
  timestamp: string;
  price: {
    current: number;
    change1h: number;
    change24h: number;
    high24h: number;
    low24h: number;
  };
  volume: {
    volume24h: number;
    buyVolume24h: number;
    sellVolume24h: number;
    buySellRatio: number;
  };
  holders: {
    total: number;
    change24h: number;
  };
  bondingCurve: {
    progressPercent: number;
    isComplete: boolean;
    virtualSolReserves: number;
    virtualTokenReserves: number;
  };
}

export interface AIStats {
  enabled: boolean;
  totalDecisions: number;
  lastDecisionTime: string | null;
  lastSentiment: string | null;
  lastConfidence: number | null;
  isProcessing: boolean;
}

// WebSocket event types
export type WSEventType =
  | 'fee_collected'
  | 'burn'
  | 'airdrop'
  | 'volume'
  | 'treasury'
  | 'error'
  | 'stats'
  | 'connected'
  // AI-related events
  | 'ai_thinking_start'
  | 'ai_thinking_section'
  | 'ai_thinking_chunk'
  | 'ai_thinking_complete'
  | 'ai_thinking_error'
  | 'ai_decision'
  | 'market_data'
  // Consciousness stream events
  | 'consciousness'
  | 'mind_stream';

export interface WSMessage {
  type: WSEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  type: WSEventType;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ============================================
// CONSCIOUSNESS STREAM TYPES
// ============================================

export type ConsciousnessType =
  | 'OBSERVING'
  | 'THINKING'
  | 'ANALYZING'
  | 'DECIDING'
  | 'EMOTIONS'
  | 'IDEA'
  | 'TRADE'
  | 'SYSTEM';

export interface ConsciousnessThought {
  id: string;
  type: ConsciousnessType;
  message: string;
  timestamp: Date;
  intensity?: number;
  metadata?: Record<string, unknown>;
}

export type MindStreamType = 'IDEA' | 'THOUGHT' | 'OBSERVATION';

export interface MindStreamThought {
  id: string;
  type: MindStreamType;
  content: string;
  timestamp: Date;
}
