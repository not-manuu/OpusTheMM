/**
 * 📊 Statistics Routes
 *
 * Exposes bot statistics and metrics
 */

import { Router, Request, Response } from 'express';
import { statsService } from '../services/statsService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const stats = statsService.getComprehensiveStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/fees', async (_req: Request, res: Response) => {
  try {
    const feeStats = statsService.getFeeStats();
    res.json({
      success: true,
      data: feeStats,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/volume', async (_req: Request, res: Response) => {
  try {
    const volumeStats = statsService.getVolumeStats();
    res.json({
      success: true,
      data: volumeStats,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/burns', async (_req: Request, res: Response) => {
  try {
    const burnStats = statsService.getBurnStats();
    res.json({
      success: true,
      data: burnStats,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/airdrops', async (_req: Request, res: Response) => {
  try {
    const airdropStats = statsService.getAirdropStats();
    res.json({
      success: true,
      data: airdropStats,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/treasury', async (_req: Request, res: Response) => {
  try {
    const treasuryStats = statsService.getTreasuryStats();
    res.json({
      success: true,
      data: treasuryStats,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export default router;
