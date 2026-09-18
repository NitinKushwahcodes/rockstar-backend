import rateLimit from 'express-rate-limit';
import { AppError, ErrorCodes } from '../lib/errors.js';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, _res, next) => {
    next(new AppError(ErrorCodes.RATE_LIMITED, 'Too many requests, please try again later', 429));
  },
});
