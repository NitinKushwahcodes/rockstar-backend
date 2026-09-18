import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createDraftSchema } from './draft.schema.js';
import { createDraft } from './draft.service.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parseResult = createDraftSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid draft data',
        400,
        parseResult.error.format()
      );
    }

    const draft = await createDraft(req.user.id, parseResult.data);
    res.status(201).json({ draft });
  } catch (err) {
    next(err);
  }
});

export default router;
