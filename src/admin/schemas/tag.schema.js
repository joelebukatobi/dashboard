import { z } from 'zod';

const optionalText = z.string().max(5000).optional().or(z.literal(''));

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  slug: z.string().trim().max(255).optional().or(z.literal('')),
  description: optionalText,
});

export const updateTagSchema = createTagSchema;
