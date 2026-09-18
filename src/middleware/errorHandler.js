import { AppError, ErrorCodes } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || 'unknown';
  const log = req.log || logger;

  if (err instanceof AppError) {
    log.warn({ err, requestId }, err.message);
    const errorBody = {
      code: err.code,
      message: err.message,
      requestId,
    };
    if (err.details) {
      errorBody.details = err.details;
    }
    return res.status(err.status).json({ error: errorBody });
  }

  // Handle express JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    log.warn({ err, requestId }, 'Malformed JSON request body');
    return res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Malformed JSON in request body',
        requestId,
      },
    });
  }

  log.error({ err, requestId }, 'Unhandled application error');

  return res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An internal server error occurred',
      requestId,
    },
  });
}
