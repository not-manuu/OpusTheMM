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

export default router;
