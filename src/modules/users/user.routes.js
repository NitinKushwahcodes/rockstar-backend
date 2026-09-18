import { Router } from 'express';
import { createUserSchema } from './user.schema.js';
import { createUser } from './user.service.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid input data',
        400,
        parseResult.error.format()
      );
    }

    const result = await createUser(parseResult.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
