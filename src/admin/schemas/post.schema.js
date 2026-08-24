import { z } from 'zod';
import { preprocessPostBody } from '../../lib/post-input.js';

const postFieldsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  slug: z.string().min(1, 'Slug is required').max(255),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(2000).optional().or(z.literal('')),
  categoryId: z.string().max(36).optional(),
  featuredImageId: z.string().uuid().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
  metaTitle: z.string().max(255).optional().or(z.literal('')),
  metaDescription: z.string().max(500).optional().or(z.literal('')),
});

export const postBodySchema = z.preprocess(preprocessPostBody, postFieldsSchema);

export const updatePostSchema = z.preprocess(
  preprocessPostBody,
  postFieldsSchema.partial().extend({
    title: z.string().min(1).max(500).optional(),
    slug: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
  }),
);
