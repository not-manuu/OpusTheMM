/**
 * 🚀 API Server
 *
 * Express server with REST API and WebSocket support
 */

import express, { Express } from 'express';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import cors from 'cors';
import { logger } from '../utils/logger';
import { config } from '../config/env';

import healthRoutes from './routes/health';
import statsRoutes from './routes/stats';
import controlRoutes from './routes/control';
import logsRoutes from './routes/logs';
import walletsRoutes, { setWalletSolanaService } from './routes/wallets';
import { SolanaService } from '../services/solanaService';

import { authenticate } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import { setupWebSocket, wsManager, IWebSocketManager } from './websocket/events';

export class ApiServer {
  private app: Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private port: number;
  private isRunning: boolean = false;

  constructor(port?: number) {
    this.port = port || config.apiPort;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();

    logger.info('API Server initialized', { port: this.port });
  }

  private setupMiddleware(): void {
    this.app.use(
      cors({
        origin: config.allowedOrigins === '*' ? '*' : config.allowedOrigins.split(','),
        credentials: true,
      })
    );

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(rateLimiter);

    this.app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.app.use('/health', healthRoutes);

    this.app.use('/stats', authenticate, statsRoutes);
    this.app.use('/logs', authenticate, logsRoutes);
    this.app.use('/control', authenticate, controlRoutes);
    this.app.use('/wallets', authenticate, walletsRoutes);

    this.app.get('/', (_req, res) => {
      res.json({
        name: "Santa's Tokenomics Bot API",
        version: '1.0.0',
        status: 'operational',
        endpoints: {
          health: '/health',
          stats: '/stats',
          wallets: '/wallets',
          control: '/control',
          logs: '/logs',
        },
        websocket: {
          url: `ws://localhost:${this.port}`,
          events: ['fee_collected', 'burn', 'airdrop', 'volume', 'treasury', 'error'],
        },
      });
    });
  }

  private setupWebSocket(): void {
    setupWebSocket(this.wss);
    logger.debug('WebSocket server setup complete');
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('API server already running');
      return;
    }

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.isRunning = true;
        logger.info(`🚀 API Server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('API server not running');
      return;
    }

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          this.isRunning = false;
          logger.info('API Server stopped');
          resolve();
        });
      });
    });
  }

  getWSS(): WebSocketServer {
    return this.wss;
  }

  getWSManager(): IWebSocketManager {
    return wsManager;
  }

  getPort(): number {
    return this.port;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  setSolanaService(solanaService: SolanaService): void {
    setWalletSolanaService(solanaService);
    logger.debug('Solana service set for wallet routes');
  }
}
