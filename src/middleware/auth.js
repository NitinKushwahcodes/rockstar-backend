import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication token required', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.sub };
    next();
  } catch {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', 401));
  }
}
