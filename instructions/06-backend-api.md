# Phase 6: Backend API & Data Layer

## Objective
Build a REST API and WebSocket server to expose bot statistics, logs, and real-time events for Telegram bot integration and frontend dashboard consumption.

---

## Prompt for Claude

```
Implement a backend API server that exposes tokenomics bot data for external consumption by Telegram bots and frontend dashboards.

BUILD: src/api/

CONTEXT:
The bot operates autonomously, but we need to expose its data and allow external systems to:
1. Query current stats (fees collected, burns, airdrops, etc.)
2. Get real-time updates via WebSocket
3. Control bot operations (start/stop, emergency actions)
4. Serve data for Telegram bot commands
5. Provide transparency data for public frontend

REQUIREMENTS:

1. REST API Endpoints
   - GET /health - Bot health status
   - GET /stats - Comprehensive statistics
   - GET /stats/fees - Fee collection history
   - GET /stats/volume - Volume creation metrics
   - GET /stats/burns - Burn history and totals
   - GET /stats/airdrops - Airdrop distribution records
   - GET /logs - Recent bot logs
   - POST /control/pause - Pause bot operations
   - POST /control/resume - Resume bot operations
   - GET /token-info - Token metadata

2. WebSocket Events
   - Real-time fee claims
   - Distribution events
   - Burn notifications
   - Airdrop completions
   - Error alerts

3. Telegram Bot Integration
   - Webhook endpoint for Telegram
   - Command handlers
   - Stats formatting for Telegram
   - Admin authentication

4. Data Export
   - CSV export for transparency
   - JSON API for frontend
   - Historical data access

5. Security
   - API key authentication
   - Rate limiting
   - Admin-only control endpoints
   - CORS configuration

PROJECT STRUCTURE:

```
src/
├── api/
│   ├── server.ts              # Express server setup
│   ├── routes/
│   │   ├── stats.ts           # Statistics endpoints
│   │   ├── control.ts         # Bot control endpoints
│   │   ├── telegram.ts        # Telegram webhook
│   │   └── health.ts          # Health check
│   ├── websocket/
│   │   └── events.ts          # WebSocket event handlers
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication
│   │   ├── rateLimit.ts       # Rate limiting
│   │   └── errorHandler.ts   # Error handling
│   ├── services/
│   │   ├── statsService.ts    # Stats aggregation
│   │   └── telegramService.ts # Telegram bot logic
│   └── types/
│       └── api.ts             # API type definitions
```

IMPLEMENTATION:

```typescript
// src/api/server.ts
import express, { Express } from 'express';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import cors from 'cors';
import { logger } from '../utils/logger';
import { config } from '../config/env';

// Routes
import statsRoutes from './routes/stats';
import controlRoutes from './routes/control';
import telegramRoutes from './routes/telegram';
import healthRoutes from './routes/health';

// Middleware
import { authenticate } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// WebSocket
import { setupWebSocket } from './websocket/events';

export class ApiServer {
  private app: Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: config.allowedOrigins || '*',
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Public routes
    this.app.use('/health', healthRoutes);

    // Protected routes (require API key)
    this.app.use('/stats', authenticate, statsRoutes);
    this.app.use('/logs', authenticate, require('./routes/logs').default);

    // Admin routes (require admin API key)
    this.app.use('/control', authenticate, controlRoutes);

    // Telegram webhook (requires Telegram token verification)
    this.app.use('/telegram', telegramRoutes);

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Tokenomics Bot API',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
          health: '/health',
          stats: '/stats',
          control: '/control',
          telegram: '/telegram/webhook',
        },
      });
    });
  }

  private setupWebSocket(): void {
    setupWebSocket(this.wss);
    logger.info('WebSocket server initialized');
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info(`🚀 API Server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('API Server stopped');
          resolve();
        });
      });
    });
  }

  getWSS(): WebSocketServer {
    return this.wss;
  }
}
```

STATS ENDPOINTS:

```typescript
// src/api/routes/stats.ts
import { Router } from 'express';
import { statsService } from '../services/statsService';

const router = Router();

// GET /stats - Comprehensive statistics
router.get('/', async (req, res) => {
  try {
    const stats = await statsService.getComprehensiveStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /stats/fees - Fee collection history
router.get('/fees', async (req, res) => {
  try {
    const feeStats = await statsService.getFeeStats();
    res.json({
      success: true,
      data: feeStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /stats/volume - Volume creation metrics
router.get('/volume', async (req, res) => {
  try {
    const volumeStats = await statsService.getVolumeStats();
    res.json({
      success: true,
      data: volumeStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /stats/burns - Burn history
router.get('/burns', async (req, res) => {
  try {
    const burnStats = await statsService.getBurnStats();
    res.json({
      success: true,
      data: burnStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /stats/airdrops - Airdrop history
router.get('/airdrops', async (req, res) => {
  try {
    const airdropStats = await statsService.getAirdropStats();
    res.json({
      success: true,
      data: airdropStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

STATS SERVICE:

```typescript
// src/api/services/statsService.ts
import { TokenomicsBot } from '../../main';

class StatsService {
  private bot: TokenomicsBot | null = null;

  setBot(bot: TokenomicsBot): void {
    this.bot = bot;
  }

  async getComprehensiveStats() {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    const feeStats = this.bot.feeCollector.getStats();
    const volumeStats = this.bot.volumeCreator.getStats();
    const burnStats = this.bot.buybackBurner.getStats();
    const airdropStats = this.bot.airdropDistributor.getStats();

    return {
      fees: {
        totalCollected: feeStats.totalCollected,
        claimCount: feeStats.claimCount,
        lastClaimTime: feeStats.lastClaimTime,
        lastClaimAmount: feeStats.lastClaimAmount,
      },
      volume: {
        totalVolume: volumeStats.totalVolume,
        tradeCount: volumeStats.tradeCount,
        successRate: (volumeStats.successfulTrades / volumeStats.tradeCount) * 100,
        lastTradeTime: volumeStats.lastTradeTime,
      },
      burns: {
        totalTokensBurned: burnStats.totalTokensBurned,
        totalSolSpent: burnStats.totalSolSpent,
        burnCount: burnStats.burnCount,
        averagePrice: burnStats.averagePricePerToken,
      },
      airdrops: {
        totalDistributed: airdropStats.totalDistributed,
        totalRecipients: airdropStats.totalRecipients,
        distributionCount: airdropStats.distributionCount,
        averagePerHolder: airdropStats.averagePerHolder,
      },
      distribution: {
        volume: '25%',
        buyback: '25%',
        airdrop: '25%',
        treasury: '25%',
      },
    };
  }

  async getFeeStats() {
    if (!this.bot) throw new Error('Bot not initialized');
    return this.bot.feeCollector.getStats();
  }

  async getVolumeStats() {
    if (!this.bot) throw new Error('Bot not initialized');
    return this.bot.volumeCreator.getStats();
  }

  async getBurnStats() {
    if (!this.bot) throw new Error('Bot not initialized');
    return this.bot.buybackBurner.getStats();
  }

  async getAirdropStats() {
    if (!this.bot) throw new Error('Bot not initialized');
    return this.bot.airdropDistributor.getStats();
  }
}

export const statsService = new StatsService();
```

TELEGRAM BOT INTEGRATION:

```typescript
// src/api/services/telegramService.ts
import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../../utils/logger';
import { statsService } from './statsService';

export class TelegramBotService {
  private bot: TelegramBot;
  private adminChatIds: number[];

  constructor(token: string, adminChatIds: number[]) {
    this.bot = new TelegramBot(token, { polling: false });
    this.adminChatIds = adminChatIds;
    this.setupCommands();
  }

  private setupCommands(): void {
    // /stats - Get current statistics
    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const stats = await statsService.getComprehensiveStats();
        const message = this.formatStatsMessage(stats);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Telegram /stats command error', { error });
        await this.bot.sendMessage(chatId, '❌ Error fetching stats');
      }
    });

    // /burns - Get burn statistics
    this.bot.onText(/\/burns/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const burnStats = await statsService.getBurnStats();
        const message = this.formatBurnMessage(burnStats);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Telegram /burns command error', { error });
        await this.bot.sendMessage(chatId, '❌ Error fetching burn stats');
      }
    });

    // /help - Show available commands
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
🎅 *Santa's Reindeer Bot Commands*

📊 /stats - View comprehensive statistics
🔥 /burns - View burn statistics
🎁 /airdrops - View airdrop statistics
💰 /volume - View volume statistics
📈 /fees - View fee collection stats
❓ /help - Show this message

Admin Only:
⏸️ /pause - Pause bot operations
▶️ /resume - Resume bot operations
      `.trim();

      await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });
  }

  private formatStatsMessage(stats: any): string {
    return `
❄️ *Frostbyte Report*

*Fee Collection:*
💰 Total Collected: ${stats.fees.totalCollected.toFixed(4)} SOL
📊 Claims: ${stats.fees.claimCount}

*Volume (Reindeer 1):*
📈 Total Volume: ${stats.volume.totalVolume.toFixed(4)} SOL
🔄 Trades: ${stats.volume.tradeCount}

*Buyback & Burn (Reindeer 2):*
🔥 Tokens Burned: ${stats.burns.totalTokensBurned.toLocaleString()}
💸 SOL Spent: ${stats.burns.totalSolSpent.toFixed(4)}

*Airdrops (Reindeer 3):*
🎁 Distributed: ${stats.airdrops.totalDistributed.toFixed(4)} SOL
👥 Recipients: ${stats.airdrops.totalRecipients}

*Distribution:*
Each Reindeer: ${stats.distribution.volume}
    `.trim();
  }

  private formatBurnMessage(burnStats: any): string {
    return `
🔥 *Burn Statistics*

Total Burned: ${burnStats.totalTokensBurned.toLocaleString()} tokens
SOL Spent: ${burnStats.totalSolSpent.toFixed(4)} SOL
Burn Events: ${burnStats.burnCount}
Average Price: ${burnStats.averagePrice.toFixed(8)} SOL/token

Last Burn: ${burnStats.lastBurnTime ? new Date(burnStats.lastBurnTime).toLocaleString() : 'Never'}
    `.trim();
  }

  async sendNotification(message: string): Promise<void> {
    // Send to all admin chat IDs
    for (const chatId of this.adminChatIds) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Failed to send Telegram notification', { error, chatId });
      }
    }
  }

  async notifyFeeCollected(amount: number, signature: string): Promise<void> {
    const message = `
💰 *Fee Collected*
Amount: ${amount.toFixed(4)} SOL
Signature: \`${signature.slice(0, 16)}...\`
    `.trim();

    await this.sendNotification(message);
  }

  async notifyBurn(tokens: number, sol: number, signature: string): Promise<void> {
    const message = `
🔥 *Tokens Burned*
Amount: ${tokens.toLocaleString()} tokens
SOL Spent: ${sol.toFixed(4)}
Signature: \`${signature.slice(0, 16)}...\`
    `.trim();

    await this.sendNotification(message);
  }

  async notifyAirdrop(amount: number, recipients: number): Promise<void> {
    const message = `
🎁 *Airdrop Completed*
Total: ${amount.toFixed(4)} SOL
Recipients: ${recipients}
    `.trim();

    await this.sendNotification(message);
  }

  setWebhook(url: string): Promise<boolean> {
    return this.bot.setWebHook(url);
  }

  processUpdate(update: any): Promise<void> {
    return this.bot.processUpdate(update);
  }
}
```

WEBSOCKET EVENTS:

```typescript
// src/api/websocket/events.ts
import { Server as WebSocketServer, WebSocket } from 'ws';
import { logger } from '../../utils/logger';

export interface WSMessage {
  type: 'fee_collected' | 'burn' | 'airdrop' | 'volume' | 'error' | 'stats';
  data: any;
  timestamp: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  setup(wss: WebSocketServer): void {
    this.wss = wss;

    wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection');
      this.clients.add(ws);

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'stats',
        data: { message: 'Connected to Santa\'s Bot' },
        timestamp: new Date().toISOString(),
      });
    });
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

    logger.debug('WebSocket broadcast', { type: message.type });
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

  broadcastStats(stats: any): void {
    this.broadcast({
      type: 'stats',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }
}

export const wsManager = new WebSocketManager();

export function setupWebSocket(wss: WebSocketServer): void {
  wsManager.setup(wss);
}
```

AUTHENTICATION MIDDLEWARE:

```typescript
// src/api/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key required',
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  next();
}
```

DEPENDENCIES TO ADD:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "node-telegram-bot-api": "^0.64.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "@types/cors": "^2.8.17",
    "@types/node-telegram-bot-api": "^0.64.2"
  }
}
```
```

---

## Success Criteria

- [ ] API server starts successfully
- [ ] All REST endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Telegram bot commands functional
- [ ] Stats service provides accurate data
- [ ] Authentication middleware works
- [ ] Real-time events broadcast via WebSocket
- [ ] Telegram notifications send properly
- [ ] CORS configured correctly
- [ ] Rate limiting in place

---

## Testing Strategy

1. **Local API Testing**:
   ```bash
   # Start API server
   npm run dev

   # Test endpoints
   curl http://localhost:3000/health
   curl -H "X-API-Key: your_key" http://localhost:3000/stats
   ```

2. **WebSocket Testing**:
   ```javascript
   const ws = new WebSocket('ws://localhost:3000');
   ws.onmessage = (event) => {
     console.log('Received:', event.data);
   };
   ```

3. **Telegram Bot Testing**:
   - Add bot to Telegram
   - Send /stats command
   - Verify response

---

## Integration with Main Bot

```typescript
// In src/main.ts
import { ApiServer } from './api/server';
import { statsService } from './api/services/statsService';
import { wsManager } from './api/websocket/events';

class TokenomicsBot {
  private apiServer!: ApiServer;

  async initialize(): Promise<void> {
    // ... existing initialization

    // Initialize API server
    this.apiServer = new ApiServer(config.apiPort);
    statsService.setBot(this);

    // Hook events to WebSocket
    this.feeCollector.onFeeClaimed = (amount, sig) => {
      wsManager.broadcastFeeCollected(amount, sig);
    };

    this.buybackBurner.onBurn = (tokens, sol, sig) => {
      wsManager.broadcastBurn(tokens, sol, sig);
    };
  }

  async start(): Promise<void> {
    // ... existing start logic

    // Start API server
    await this.apiServer.start();
  }

  async stop(): Promise<void> {
    // ... existing stop logic

    // Stop API server
    await this.apiServer.stop();
  }
}
```

---

## Environment Variables

Add to `.env`:
```
API_PORT=3000
API_KEY=your_secret_api_key
ALLOWED_ORIGINS=*
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321
```

---

## Next Phase

After implementing the backend API, proceed to:
👉 **Phase 7**: `07-main-orchestrator.md`

---

## Future Enhancements

- Database integration (PostgreSQL/MongoDB) for historical data
- Advanced analytics endpoints
- Discord bot integration
- Grafana dashboard
- Webhook for external services
- Mobile app push notifications
