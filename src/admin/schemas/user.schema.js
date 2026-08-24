import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';
import { validatePasswordStrength } from '../../utils/security.js';
import { getRequestSettings } from '../../lib/settings-context.js';

function optionalPasswordField() {
  return z.string().max(255).optional().or(z.literal(''));
}

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
  sendInvite: z.union([
    z.literal('on'),
    z.literal('true'),
    z.literal('false'),
    z.literal(''),
    z.boolean(),
  ]).optional(),
  _csrf: z.string().optional(),
}).strip();

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: emailSchema.optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
  currentPassword: optionalPasswordField(),
  newPassword: optionalPasswordField(),
  confirmPassword: optionalPasswordField(),
}).superRefine((data, ctx) => {
  const newPassword = String(data.newPassword || '').trim();
  const confirmPassword = String(data.confirmPassword || '').trim();
  const currentPassword = String(data.currentPassword || '').trim();

  if (!newPassword) {
    if (confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Leave confirm password blank when not changing password',
      });
    }
    if (currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentPassword'],
        message: 'Enter a new password to update your password',
      });
    }
    return;
  }

  if (newPassword !== confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }

  const requireStrong = getRequestSettings().requireStrongPasswords !== false;
  const strength = validatePasswordStrength(newPassword, { requireStrong });
  if (!strength.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['newPassword'],
      message: strength.errors.join('. '),
    });
  }
});

export const totpVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});
