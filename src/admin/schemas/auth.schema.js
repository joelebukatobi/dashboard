import { z } from 'zod';
import { validatePasswordStrength } from '../../utils/security.js';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .email('Invalid email format')
    .transform((email) => email.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }

  const strength = validatePasswordStrength(data.password);
  if (!strength.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: strength.errors.join('. '),
    });
  }
});
