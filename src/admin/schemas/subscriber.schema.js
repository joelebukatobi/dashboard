import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

export const createSubscriberSchema = z.object({
  email: emailSchema,
  status: z.enum(['ACTIVE', 'PENDING', 'UNSUBSCRIBED', 'BOUNCED']).optional(),
});

export const updateSubscriberSchema = createSubscriberSchema;
