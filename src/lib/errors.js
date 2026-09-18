export class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_ROOM_OWNER: 'NOT_ROOM_OWNER',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DRAFT_NOT_FOUND: 'DRAFT_NOT_FOUND',
  SPIN_NOT_FOUND: 'SPIN_NOT_FOUND',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  SPIN_ALREADY_ACTIVE: 'SPIN_ALREADY_ACTIVE',
  INSUFFICIENT_PLAYERS: 'INSUFFICIENT_PLAYERS',
  TOO_MANY_PLAYERS: 'TOO_MANY_PLAYERS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
