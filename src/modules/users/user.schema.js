import { z } from 'zod';

export const createUserSchema = z.object({
  displayName: z.string().trim().min(1, 'displayName is required'),
});
