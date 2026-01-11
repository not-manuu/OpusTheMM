'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  WSMessage,
  ActivityEvent,
  WSEventType,
  ThoughtChunk,
  ThoughtSectionName,
  AIDecision,
  MarketSnapshot,
  ConsciousnessThought,
  ConsciousnessType,
  MindStreamThought,
  MindStreamType,
} from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

// AI thinking state
export interface AIThinkingState {
  isThinking: boolean;
  currentSection: ThoughtSectionName | null;
  thoughts: Record<ThoughtSectionName, string>;
  lastDecision: AIDecision | null;
  lastError: string | null;
  marketData: MarketSnapshot | null;
}

// Consciousness stream state
export interface ConsciousnessState {
  thoughts: ConsciousnessThought[];
  mindStream: MindStreamThought[];
  isStreaming: boolean;
}

const initialAIState: AIThinkingState = {
  isThinking: false,
  currentSection: null,
  thoughts: {
    market_analysis: '',
    sentiment: '',
    risk_assessment: '',
    strategy: '',
    allocation: '',
  },
  lastDecision: null,
  lastError: null,
  marketData: null,
};

const initialConsciousnessState: ConsciousnessState = {
  thoughts: [],
  mindStream: [],
  isStreaming: false,
};

function formatEventMessage(type: WSEventType, data: Record<string, unknown>): string {
  switch (type) {
    case 'fee_collected':
      return `Fee collected: ${(data.amount as number)?.toFixed(4)} SOL`;
    case 'volume':
      return `Volume trade: ${(data.amount as number)?.toFixed(4)} SOL`;
    case 'burn':
      return `Burned ${(data.tokens as number)?.toLocaleString()} tokens (${(data.sol as number)?.toFixed(4)} SOL)`;
    case 'airdrop':
      return `Airdrop: ${(data.amount as number)?.toLocaleString()} to ${data.recipients} holders`;
    case 'treasury':
      return `Treasury transfer: ${(data.amount as number)?.toFixed(4)} SOL`;
    case 'error':
      return `Error: ${data.message}`;
    case 'connected':
      return 'Connected to server';
    case 'stats':
      return 'Stats updated';
    case 'ai_thinking_start':
      return 'AI analysis starting...';
    case 'ai_thinking_section':
      return `AI analyzing: ${data.section}`;
    case 'ai_thinking_complete':
      return 'AI decision complete';
    case 'ai_thinking_error':
      return `AI error: ${data.error}`;
    case 'ai_decision':
      return `AI allocated: V${(data.allocation as { volume: number })?.volume}% B${(data.allocation as { buyback: number })?.buyback}% A${(data.allocation as { airdrop: number })?.airdrop}% T${(data.allocation as { treasury: number })?.treasury}%`;
    case 'market_data':
      return 'Market data updated';
    default:
      return `Event: ${type}`;
  }
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [lastStats, setLastStats] = useState<Record<string, unknown> | null>(null);
  const [aiState, setAIState] = useState<AIThinkingState>(initialAIState);
  const [consciousness, setConsciousness] = useState<ConsciousnessState>(initialConsciousnessState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Handle stats updates separately
          if (message.type === 'stats') {
            setLastStats(message.data);
            return;
          }

          // Handle AI events
          if (message.type === 'ai_thinking_start') {
            setAIState((prev) => ({
              ...initialAIState,
              isThinking: true,
              lastDecision: prev.lastDecision,
              marketData: prev.marketData,
            }));
          } else if (message.type === 'ai_thinking_section') {
            setAIState((prev) => ({
              ...prev,
              currentSection: message.data.section as ThoughtSectionName,
            }));
          } else if (message.type === 'ai_thinking_chunk') {
            const chunk = message.data as unknown as ThoughtChunk;
            setAIState((prev) => ({
              ...prev,
              currentSection: chunk.section,
              thoughts: {
                ...prev.thoughts,
                [chunk.section]: prev.thoughts[chunk.section] + chunk.content,
              },
            }));
          } else if (message.type === 'ai_thinking_complete') {
            const decision = message.data.decision as AIDecision;
            setAIState((prev) => ({
              ...prev,
              isThinking: false,
              lastDecision: decision,
              lastError: null,
            }));
          } else if (message.type === 'ai_thinking_error') {
            setAIState((prev) => ({
              ...prev,
              isThinking: false,
              lastError: message.data.error as string,
            }));
          } else if (message.type === 'ai_decision') {
            setAIState((prev) => ({
              ...prev,
              lastDecision: message.data as unknown as AIDecision,
            }));
          } else if (message.type === 'market_data') {
            setAIState((prev) => ({
              ...prev,
              marketData: message.data as unknown as MarketSnapshot,
            }));
          }

          // Handle consciousness stream events
          if (message.type === 'consciousness') {
            const thought: ConsciousnessThought = {
              id: message.data.id as string,
              type: message.data.type as ConsciousnessType,
              message: message.data.message as string,
              timestamp: new Date(message.data.timestamp as string),
              intensity: message.data.intensity as number | undefined,
              metadata: message.data.metadata as Record<string, unknown> | undefined,
            };
            setConsciousness((prev) => ({
              ...prev,
              isStreaming: true,
              thoughts: [...prev.thoughts, thought].slice(-200), // Keep last 200 thoughts
            }));
          } else if (message.type === 'mind_stream') {
            const thought: MindStreamThought = {
              id: message.data.id as string,
              type: message.data.type as MindStreamType,
              content: message.data.content as string,
              timestamp: new Date(message.data.timestamp as string),
            };
            setConsciousness((prev) => ({
              ...prev,
              mindStream: [...prev.mindStream, thought].slice(-50), // Keep last 50
            }));
          }

          // Add to activity feed (except for chunk events and consciousness which are too frequent)
          if (message.type !== 'ai_thinking_chunk' && message.type !== 'consciousness' && message.type !== 'mind_stream') {
            const activityEvent: ActivityEvent = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: message.type,
              message: formatEventMessage(message.type, message.data),
              timestamp: new Date(message.timestamp),
              data: message.data,
            };

            setEvents((prev) => [activityEvent, ...prev].slice(0, 50)); // Keep last 50 events
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected, reconnecting in 3s...');

        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    events,
    lastStats,
    aiState,
    consciousness,
  };
}
