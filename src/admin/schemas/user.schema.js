import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']),
  sendInvite: z.union([z.literal('on'), z.literal('true'), z.boolean()]).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: emailSchema.optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});
