/**
 * 🚦 Rate Limiting Middleware
 *
 * Prevents API abuse with configurable rate limits
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(options.statusCode).json(options.message);
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for control endpoints
  message: {
    success: false,
    error: 'Rate limit exceeded for control endpoint',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
