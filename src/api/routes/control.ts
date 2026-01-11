/**
 * 🎮 Bot Control Routes
 *
 * Admin endpoints for controlling bot operations
 */

import { Router, Request, Response } from 'express';
import { statsService } from '../services/statsService';
import { strictRateLimiter } from '../middleware/rateLimit';
import { logger } from '../../utils/logger';

const router = Router();

// Store reference to decision engine for testing
let testDecisionEngine: {
  forceDecision: (amount: number) => Promise<unknown>;
  isEnabled: () => boolean;
  isBusy: () => boolean;
} | null = null;

export function setTestDecisionEngine(engine: typeof testDecisionEngine): void {
  testDecisionEngine = engine;
}

router.use(strictRateLimiter);

router.post('/pause', async (_req: Request, res: Response) => {
  try {
    const result = await statsService.pauseBot();
    logger.info('Bot paused via API');
    res.json({
      success: true,
      message: 'Bot operations paused',
      data: result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to pause bot', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.post('/resume', async (_req: Request, res: Response) => {
  try {
    const result = await statsService.resumeBot();
    logger.info('Bot resumed via API');
    res.json({
      success: true,
      message: 'Bot operations resumed',
      data: result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to resume bot', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = statsService.getBotStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.post('/emergency-stop', async (_req: Request, res: Response) => {
  try {
    const result = await statsService.emergencyStop();
    logger.warn('Emergency stop triggered via API');
    res.json({
      success: true,
      message: 'Emergency stop executed',
      data: result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to execute emergency stop', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * Test AI Analysis - Triggers the AI brain to analyze and show consciousness stream
 * POST /api/control/test-ai
 */
router.post('/test-ai', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!testDecisionEngine) {
      res.status(503).json({
        success: false,
        error: 'AI Decision Engine not available',
      });
      return;
    }

    if (!testDecisionEngine.isEnabled()) {
      res.status(400).json({
        success: false,
        error: 'AI Decision Engine is disabled. Check ANTHROPIC_API_KEY in .env',
      });
      return;
    }

    if (testDecisionEngine.isBusy()) {
      res.status(429).json({
        success: false,
        error: 'AI is already analyzing. Please wait.',
      });
      return;
    }

    // Use test amount from request or default to 0.1 SOL
    const testAmount = parseFloat(req.body?.amount) || 0.1;

    logger.info('🧪 Test AI analysis triggered via API', { testAmount });

    // This will trigger the full AI analysis with consciousness stream
    const decision = await testDecisionEngine.forceDecision(testAmount);

    res.json({
      success: true,
      message: 'AI analysis complete - check dashboard for consciousness stream',
      data: decision,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Test AI analysis failed', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export default router;
