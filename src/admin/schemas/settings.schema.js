import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

/** Settings forms send many dynamic keys; validate shape loosely. */
export const settingsUpdateSchema = z.record(z.unknown());

export const siteIconSelectSchema = z.object({
  siteIcon: z.string().min(1, 'Image path is required'),
  _csrf: z.string().optional(),
});

export const testEmailSchema = z.object({
  testEmailTo: z.union([emailSchema, z.literal('')]).optional(),
  _csrf: z.string().optional(),
});
