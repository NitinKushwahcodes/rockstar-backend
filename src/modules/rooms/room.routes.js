import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createRoomSchema, roomIdParamSchema, shareDraftBodySchema } from './room.schema.js';
import { createRoom, getRoomState, joinRoom, leaveRoom } from './room.service.js';
import { shareDraftToRoom } from '../drafts/draft.service.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';

const router = Router();

function validateRoomId(req) {
  const parseResult = roomIdParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid room ID format', 400);
  }
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid input data',
        400,
        parseResult.error.format()
      );
    }

    const roomState = await createRoom(req.user.id, parseResult.data);
    res.status(201).json({ room: roomState });
  } catch (err) {
    next(err);
  }
});

router.post('/:roomId/join', requireAuth, async (req, res, next) => {
  try {
    validateRoomId(req);
    const roomState = await joinRoom(req.params.roomId, req.user.id);
    res.status(200).json({ room: roomState });
  } catch (err) {
    next(err);
  }
});

router.post('/:roomId/leave', requireAuth, async (req, res, next) => {
  try {
    validateRoomId(req);
    const roomState = await leaveRoom(req.params.roomId, req.user.id);
    res.status(200).json({ room: roomState });
  } catch (err) {
    next(err);
  }
});

router.get('/:roomId', requireAuth, async (req, res, next) => {
  try {
    validateRoomId(req);
    const roomState = await getRoomState(req.params.roomId);
    res.status(200).json({ room: roomState });
  } catch (err) {
    next(err);
  }
});

router.post('/:roomId/drafts', requireAuth, async (req, res, next) => {
  try {
    validateRoomId(req);
    const parseResult = shareDraftBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid draft ID format',
        400,
        parseResult.error.format()
      );
    }

    const draft = await shareDraftToRoom(req.params.roomId, parseResult.data.draftId, req.user.id);
    res.status(200).json({ draft });
  } catch (err) {
    next(err);
  }
});

export default router;
