import { z } from 'zod';

export const replyCommentSchema = z.object({
  parentId: z.string().min(1).max(36),
  content: z.string().trim().min(1, 'Content is required').max(10000),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').max(10000),
});
