import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
});

export const roomIdParamSchema = z.object({
  roomId: objectIdSchema,
});

export const shareDraftBodySchema = z.object({
  draftId: objectIdSchema,
});
