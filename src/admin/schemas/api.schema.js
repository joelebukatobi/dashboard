import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

export const publicCommentSchema = z.object({
  postSlug: z.string().trim().min(1).max(255),
  authorName: z.string().trim().max(255).optional(),
  authorEmail: emailSchema.optional().or(z.literal('')),
  content: z.string().trim().min(2).max(5000),
  parentId: z.string().max(36).optional().nullable(),
  website: z.string().max(0).optional(),
  url: z.string().max(0).optional(),
});

export const subscribeSchema = z.object({
  email: emailSchema,
});
