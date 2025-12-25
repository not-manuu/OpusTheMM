/**
 * 🔐 API Authentication Middleware
 *
 * Validates API key from request headers
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    logger.warn('API request without API key', {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      success: false,
      error: 'API key required',
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    logger.warn('API request with invalid API key', {
      path: req.path,
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  next();
}
