/**
 * 📜 Logs Routes
 *
 * Provides access to recent bot logs
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const LOGS_DIR = path.join(process.cwd(), 'logs');
const MAX_LINES = 100;

router.get('/', async (req: Request, res: Response) => {
  try {
    const level = (req.query.level as string) || 'combined';
    const lines = parseInt(req.query.lines as string) || MAX_LINES;

    const logFile = path.join(LOGS_DIR, `${level}.log`);

    if (!fs.existsSync(logFile)) {
      res.json({
        success: true,
        data: {
          logs: [],
          message: 'No log file found',
        },
      });
      return;
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const logLines = content.split('\n').filter((line) => line.trim());
    const recentLogs = logLines.slice(-lines);

    res.json({
      success: true,
      data: {
        logs: recentLogs,
        total: logLines.length,
        returned: recentLogs.length,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/errors', async (req: Request, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string) || MAX_LINES;
    const logFile = path.join(LOGS_DIR, 'error.log');

    if (!fs.existsSync(logFile)) {
      res.json({
        success: true,
        data: {
          logs: [],
          message: 'No error log file found',
        },
      });
      return;
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const logLines = content.split('\n').filter((line) => line.trim());
    const recentLogs = logLines.slice(-lines);

    res.json({
      success: true,
      data: {
        logs: recentLogs,
        total: logLines.length,
        returned: recentLogs.length,
      },
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
