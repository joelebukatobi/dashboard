import { z } from 'zod';

const optionalText = z.string().max(5000).optional().or(z.literal(''));

export const createAlbumSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  slug: z.string().trim().max(255).optional().or(z.literal('')),
  description: optionalText,
  coverImageId: z.string().max(36).optional().or(z.literal('')),
});

export const updateAlbumSchema = createAlbumSchema;
