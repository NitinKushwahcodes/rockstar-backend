import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { spinIdParamSchema, startSpinParamSchema } from './spin.schema.js';
import { getSpinState, startSpin } from './spin.service.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';

const router = Router();

router.post('/rooms/:roomId/spins', requireAuth, async (req, res, next) => {
  try {
    const parseResult = startSpinParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid room ID format', 400);
    }

    const spin = await startSpin(req.params.roomId, req.user.id);
    res.status(201).json({ spin });
  } catch (err) {
    next(err);
  }
});

router.get('/spins/:spinId', requireAuth, async (req, res, next) => {
  try {
    const parseResult = spinIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid spin ID format', 400);
    }

    const spin = await getSpinState(req.params.spinId);
    res.status(200).json({ spin });
  } catch (err) {
    next(err);
  }
});

export default router;
