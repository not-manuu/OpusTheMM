/**
 * ❤️ Health Check Routes
 *
 * Provides health status endpoints for monitoring
 */

import { Router, Request, Response } from 'express';

const router = Router();

const startTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    success: true,
    status: 'healthy',
    uptime,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.get('/ready', (_req: Request, res: Response) => {
  res.json({
    success: true,
    ready: true,
  });
});

router.get('/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    live: true,
  });
});

export default router;
