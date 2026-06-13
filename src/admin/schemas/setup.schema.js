import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

function isValidPassword(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

export const setupBodySchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required (min 2 characters)'),
  lastName: z.string().trim().min(2, 'Last name is required (min 2 characters)'),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(isValidPassword, {
      message: 'Password must contain uppercase, lowercase, number, and special character',
    }),
  confirmPassword: z.string(),
  demoData: z.union([z.literal('on'), z.literal('true'), z.boolean()]).optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
});

/**
 * Map Zod issues to setup wizard field errors.
 * @param {import('zod').ZodError} error
 * @returns {Record<string, string>}
 */
export function mapZodErrorsToFields(error) {
  /** @type {Record<string, string>} */
  const errors = {};

  for (const issue of error.errors) {
    const key = issue.path[0];
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message;
    }
  }

  return errors;
}

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
