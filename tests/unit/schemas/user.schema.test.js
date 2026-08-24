import { describe, it, expect } from 'vitest';
import { updateUserSchema } from '../../../src/admin/schemas/user.schema.js';

describe('updateUserSchema password fields', () => {
  const validPassword = 'Secure1!pass';

  it('accepts profile updates without password fields', () => {
    const result = updateUserSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(result.success).toBe(true);
  });

  it('accepts matching new and confirm passwords', () => {
    const result = updateUserSchema.safeParse({
      newPassword: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = updateUserSchema.safeParse({
      newPassword: validPassword,
      confirmPassword: 'Other1!pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects current password without new password', () => {
    const result = updateUserSchema.safeParse({
      currentPassword: 'OldPass1!',
    });
    expect(result.success).toBe(false);
  });
});
