import { z } from 'zod';

/** Settings forms send many dynamic keys; validate shape loosely. */
export const settingsUpdateSchema = z.record(z.unknown());

export const siteIconSelectSchema = z.object({
  siteIcon: z.string().min(1, 'Image path is required'),
  _csrf: z.string().optional(),
});
