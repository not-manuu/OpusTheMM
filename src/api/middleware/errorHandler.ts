/**
 * 🚨 Global Error Handler Middleware
 *
 * Catches and formats all API errors
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error('API Error', {
    path: req.path,
    method: req.method,
    statusCode,
    error: message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
}
