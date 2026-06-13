import { z } from 'zod';

export const updateMediaSchema = z.object({
  title: z.string().trim().max(255).optional().or(z.literal('')),
  altText: z.string().trim().max(500).optional().or(z.literal('')),
  albumId: z.string().max(36).optional().or(z.literal('')),
});
