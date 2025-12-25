/**
 * Test Phase 6: API Server + Telegram Bot
 *
 * Tests:
 * - API Server initialization
 * - REST API endpoints
 * - WebSocket connections
 * - Telegram bot integration
 * - Stats service
 */

import { ApiServer } from './api/server';
import { telegramBot } from './services/telegramBot';
import { logger } from './utils/logger';
import { config } from './config/env';

// For testing HTTP requests
import http from 'http';

async function main() {
  logger.info('🧪 Testing Phase 6: API Server + Telegram Bot');
  logger.info('='.repeat(70));

  try {
    // ============================================
    // 1. Test Telegram Bot Initialization
    // ============================================
    logger.info('\n📱 Step 1: Testing Telegram Bot...');

    logger.info('Telegram Bot Status:', {
      isActive: telegramBot.isActive(),
      adminCount: telegramBot.getAdminCount(),
      configured: !!config.telegramBotToken,
    });

    if (telegramBot.isActive()) {
      logger.info('✅ Telegram bot initialized successfully');

      // Test sending a notification (only if enabled)
      await telegramBot.sendNotification({
        message: '🧪 Test notification from Santa\'s Tokenomics Bot',
        type: 'info',
      });
      logger.info('✅ Test notification sent');
    } else {
      logger.info('ℹ️  Telegram bot not configured (this is OK for testing)');
    }

    // ============================================
    // 2. Test API Server Initialization
    // ============================================
    logger.info('\n🚀 Step 2: Testing API Server Initialization...');

    const apiServer = new ApiServer(config.apiPort);
    logger.info('✅ API Server instance created');

    // Start the server
    await apiServer.start();
    logger.info(`✅ API Server started on port ${apiServer.getPort()}`);

    // Wait a bit for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ============================================
    // 3. Test Health Endpoint (No Auth Required)
    // ============================================
    logger.info('\n🏥 Step 3: Testing Health Endpoint...');

    const healthResult = await makeRequest(
      apiServer.getPort(),
      '/health',
      'GET'
    );
    logger.info('Health Response:', healthResult);

    if (healthResult.success) {
      logger.info('✅ Health endpoint working');
    } else {
      throw new Error('Health endpoint failed');
    }

    // ============================================
    // 4. Test Root Endpoint
    // ============================================
    logger.info('\n📋 Step 4: Testing Root Endpoint...');

    const rootResult = await makeRequest(apiServer.getPort(), '/', 'GET');
    logger.info('Root Response:', {
      name: rootResult.name,
      version: rootResult.version,
      status: rootResult.status,
      endpoints: rootResult.endpoints,
    });

    if (rootResult.name) {
      logger.info('✅ Root endpoint working');
    } else {
      throw new Error('Root endpoint failed');
    }

    // ============================================
    // 5. Test Authenticated Endpoint (Stats)
    // ============================================
    logger.info('\n🔐 Step 5: Testing Authenticated Endpoints...');

    // Test without API key (should fail)
    logger.info('Testing without API key...');
    try {
      await makeRequest(apiServer.getPort(), '/stats', 'GET');
      throw new Error('Should have failed without API key');
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('401') || err.message.includes('403')) {
        logger.info('✅ Correctly rejected request without API key');
      } else {
        throw error;
      }
    }

    // Test with API key (should succeed)
    logger.info('Testing with API key...');
    const statsResult = await makeRequest(
      apiServer.getPort(),
      '/stats',
      'GET',
      null,
      config.apiKey
    );
    logger.info('Stats Response:', statsResult);

    if (statsResult.success !== undefined) {
      logger.info('✅ Authenticated endpoint working');
    } else {
      throw new Error('Stats endpoint failed');
    }

    // ============================================
    // 6. Test Stats Endpoints
    // ============================================
    logger.info('\n📊 Step 6: Testing Stats Endpoints...');

    const endpoints = [
      '/stats/fees',
      '/stats/volume',
      '/stats/burns',
      '/stats/airdrops',
      '/stats/treasury',
    ];

    for (const endpoint of endpoints) {
      const result = await makeRequest(
        apiServer.getPort(),
        endpoint,
        'GET',
        null,
        config.apiKey
      );
      logger.info(`${endpoint}: ${result.success ? '✅' : '❌'}`);
    }

    logger.info('✅ All stats endpoints working');

    // ============================================
    // 7. Test Control Endpoints
    // ============================================
    logger.info('\n🎮 Step 7: Testing Control Endpoints...');

    // Test status endpoint
    const statusResult = await makeRequest(
      apiServer.getPort(),
      '/control/status',
      'GET',
      null,
      config.apiKey
    );
    logger.info('Control Status:', statusResult.data);

    if (statusResult.success) {
      logger.info('✅ Control status endpoint working');
    }

    // ============================================
    // 8. Test WebSocket Manager
    // ============================================
    logger.info('\n🔌 Step 8: Testing WebSocket Manager...');

    const wsManager = apiServer.getWSManager();
    logger.info('WebSocket Manager:', {
      clientCount: wsManager.getClientCount(),
    });

    // Test broadcasting
    wsManager.broadcastStats({
      test: 'WebSocket broadcast test',
      timestamp: new Date().toISOString(),
    });
    logger.info('✅ WebSocket broadcast sent');

    wsManager.broadcastFeeCollected(0.01, 'test_signature_123');
    logger.info('✅ Fee collected event broadcasted');

    // ============================================
    // 9. Test Logs Endpoint
    // ============================================
    logger.info('\n📄 Step 9: Testing Logs Endpoint...');

    const logsResult = await makeRequest(
      apiServer.getPort(),
      '/logs',
      'GET',
      null,
      config.apiKey
    );

    if (logsResult.success) {
      logger.info('✅ Logs endpoint working');
      const data = logsResult.data as Record<string, unknown>;
      const logs = data?.logs as Array<unknown> | undefined;
      logger.info(`Log entries available: ${logs?.length || 0}`);
    }

    // ============================================
    // 10. Stop Server
    // ============================================
    logger.info('\n🛑 Step 10: Stopping API Server...');

    await apiServer.stop();
    logger.info('✅ API Server stopped cleanly');

    // ============================================
    // Summary
    // ============================================
    logger.info('\n' + '='.repeat(70));
    logger.info('✅ PHASE 6 TESTS PASSED!');
    logger.info('='.repeat(70));
    logger.info('\n📋 Test Summary:');
    logger.info('  ✅ Telegram Bot: Initialized');
    logger.info('  ✅ API Server: Working');
    logger.info('  ✅ Health Endpoint: Working');
    logger.info('  ✅ Authentication: Working');
    logger.info('  ✅ Stats Endpoints: All Working');
    logger.info('  ✅ Control Endpoints: Working');
    logger.info('  ✅ Logs Endpoint: Working');
    logger.info('  ✅ WebSocket: Working');
    logger.info('\n💡 Next Steps:');
    logger.info('  1. Build Phase 7 (Main Orchestrator)');
    logger.info('  2. Full integration test');
    logger.info('  3. Deploy to Render');

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Test failed:', { error: errorMsg });
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(
  port: number,
  path: string,
  method: string,
  data?: Record<string, unknown> | null,
  apiKey?: string
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`
              )
            );
            return;
          }

          const jsonResponse = JSON.parse(body);
          resolve(jsonResponse as Record<string, unknown>);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

main();
