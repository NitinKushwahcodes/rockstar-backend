import { z } from 'zod';
import { objectIdSchema } from '../rooms/room.schema.js';

export const spinIdParamSchema = z.object({
  spinId: objectIdSchema,
});

export const startSpinParamSchema = z.object({
  roomId: objectIdSchema,
});
