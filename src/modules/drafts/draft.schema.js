import { z } from 'zod';

export const createDraftSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  durationMs: z.number().positive('durationMs must be a positive number'),
  effect: z.enum(['NONE', 'ECHO', 'REVERB', 'PITCH_SHIFT']).default('NONE'),
  fileUrl: z.string().url('fileUrl must be a valid URL'),
});
