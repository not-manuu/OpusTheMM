/**
 * 🔌 WebSocket Event Manager
 *
 * Handles real-time event broadcasting to connected clients
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import { logger } from '../../utils/logger';

export interface WSMessage {
  type:
    | 'fee_collected'
    | 'burn'
    | 'airdrop'
    | 'volume'
    | 'treasury'
    | 'error'
    | 'stats'
    | 'connected';
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
        data: { message: "Connected to Santa's Tokenomics Bot" },
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
}

export const wsManager = new WebSocketManager();

export function setupWebSocket(wss: WebSocketServer): void {
  wsManager.setup(wss);
}
