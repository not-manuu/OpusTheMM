/**
 * 🔌 WebSocket Event Manager
 *
 * Handles real-time event broadcasting to connected clients
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import { logger } from '../../utils/logger';
import {
  AIDecision,
  ThoughtChunk,
  MarketSnapshot,
  ThoughtSectionName,
  ConsciousnessThought,
  MindStreamThought,
} from '../../ai/types';

export interface WSMessage {
  type:
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
  data: Record<string, unknown>;
  timestamp: string;
}

export interface IWebSocketManager {
  setup(wss: WebSocketServer): void;
  broadcast(message: WSMessage): void;
  broadcastFeeCollected(amount: number, signature: string): void;
  broadcastBurn(tokens: number, sol: number, signature: string): void;
  broadcastAirdrop(amount: number, recipients: number): void;
  broadcastVolume(amount: number, signature: string): void;
  broadcastTreasury(amount: number, signature: string): void;
  broadcastError(message: string, details?: Record<string, unknown>): void;
  broadcastStats(stats: Record<string, unknown>): void;
  getClientCount(): number;
  // AI-related broadcasts
  broadcastThinkingStart(): void;
  broadcastThinkingSection(section: ThoughtSectionName): void;
  broadcastThinkingChunk(chunk: ThoughtChunk): void;
  broadcastThinkingComplete(decision: AIDecision): void;
  broadcastThinkingError(error: string): void;
  broadcastAIDecision(decision: AIDecision): void;
  broadcastMarketData(data: MarketSnapshot): void;
  // Consciousness stream broadcasts
  broadcastConsciousness(thought: ConsciousnessThought): void;
  broadcastMindStream(thought: MindStreamThought): void;
}

class WebSocketManager implements IWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  setup(wss: WebSocketServer): void {
    this.wss = wss;

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection');
      this.clients.add(ws);

      ws.on('close', () => {
        logger.debug('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
        this.clients.delete(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch {
          logger.debug('Invalid WebSocket message received');
        }
      });

      this.sendToClient(ws, {
        type: 'connected',
        data: { message: "Connected to Frostbyte" },
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('WebSocket manager initialized');
  }

  private handleMessage(ws: WebSocket, message: Record<string, unknown>): void {
    if (message.type === 'ping') {
      this.sendToClient(ws, {
        type: 'stats',
        data: { pong: true },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WSMessage): void {
    const payload = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    logger.debug('WebSocket broadcast', {
      type: message.type,
      clients: this.clients.size,
    });
  }

  broadcastFeeCollected(amount: number, signature: string): void {
    this.broadcast({
      type: 'fee_collected',
      data: { amount, signature },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastBurn(tokens: number, sol: number, signature: string): void {
    this.broadcast({
      type: 'burn',
      data: { tokens, sol, signature },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastAirdrop(amount: number, recipients: number): void {
    this.broadcast({
      type: 'airdrop',
      data: { amount, recipients },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastVolume(amount: number, signature: string): void {
    this.broadcast({
      type: 'volume',
      data: { amount, signature },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastTreasury(amount: number, signature: string): void {
    this.broadcast({
      type: 'treasury',
      data: { amount, signature },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastError(message: string, details?: Record<string, unknown>): void {
    this.broadcast({
      type: 'error',
      data: { message, ...details },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastStats(stats: Record<string, unknown>): void {
    this.broadcast({
      type: 'stats',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  // ============================================
  // AI-RELATED BROADCASTS
  // ============================================

  /**
   * Notify clients that AI analysis has started
   */
  broadcastThinkingStart(): void {
    this.broadcast({
      type: 'ai_thinking_start',
      data: {
        message: 'AI analysis starting...',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify clients of current thinking section
   */
  broadcastThinkingSection(section: ThoughtSectionName): void {
    this.broadcast({
      type: 'ai_thinking_section',
      data: { section },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stream a thought chunk to clients
   */
  broadcastThinkingChunk(chunk: ThoughtChunk): void {
    this.broadcast({
      type: 'ai_thinking_chunk',
      data: {
        section: chunk.section,
        content: chunk.content,
        isComplete: chunk.isComplete,
        chunkTimestamp: chunk.timestamp.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify clients that AI thinking is complete
   */
  broadcastThinkingComplete(decision: AIDecision): void {
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
  broadcastThinkingError(error: string): void {
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
      data: { ...decision },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast market data snapshot
   */
  broadcastMarketData(data: MarketSnapshot): void {
    this.broadcast({
      type: 'market_data',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // CONSCIOUSNESS STREAM BROADCASTS
  // ============================================

  /**
   * Broadcast a consciousness thought (terminal stream)
   */
  broadcastConsciousness(thought: ConsciousnessThought): void {
    this.broadcast({
      type: 'consciousness',
      data: {
        id: thought.id,
        type: thought.type,
        message: thought.message,
        timestamp: thought.timestamp.toISOString(),
        intensity: thought.intensity,
        metadata: thought.metadata,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a mind stream thought (categorized display)
   */
  broadcastMindStream(thought: MindStreamThought): void {
    this.broadcast({
      type: 'mind_stream',
      data: {
        id: thought.id,
        type: thought.type,
        content: thought.content,
        timestamp: thought.timestamp.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export const wsManager = new WebSocketManager();

export function setupWebSocket(wss: WebSocketServer): void {
  wsManager.setup(wss);
}
