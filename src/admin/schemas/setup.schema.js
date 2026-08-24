import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';
import { validatePasswordStrength } from '../../utils/security.js';

export const setupBodySchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required (min 2 characters)'),
  lastName: z.string().trim().min(2, 'Last name is required (min 2 characters)'),
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
  demoData: z.union([z.literal('on'), z.literal('true'), z.boolean()]).optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }

  const strength = validatePasswordStrength(data.password, { requireStrong: true });
  if (!strength.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: strength.errors.join('. '),
    });
  }
});

/**
 * @param {Record<string, unknown>|undefined|null} body
 */
export function pickSetupValues(body) {
  return {
    firstName: body?.firstName ?? '',
    lastName: body?.lastName ?? '',
    email: body?.email ?? '',
    demoData: body?.demoData,
  };
}
