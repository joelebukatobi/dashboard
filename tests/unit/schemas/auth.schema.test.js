import { describe, it, expect } from 'vitest';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../src/admin/schemas/auth.schema.js';

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const validPassword = 'Secure1!pass';

  it('accepts matching strong passwords', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: validPassword,
      confirmPassword: 'Other1!pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('requires token', () => {
    const result = resetPasswordSchema.safeParse({
      password: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(false);
  });
});
