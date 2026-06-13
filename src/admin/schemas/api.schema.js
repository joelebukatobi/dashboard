import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

export const publicCommentSchema = z.object({
  postId: z.string().min(1).max(36),
  authorName: z.string().trim().max(255).optional(),
  authorEmail: emailSchema.optional().or(z.literal('')),
  content: z.string().trim().min(1).max(10000),
  parentId: z.string().max(36).optional().nullable(),
});

export const subscribeSchema = z.object({
  email: emailSchema,
});
