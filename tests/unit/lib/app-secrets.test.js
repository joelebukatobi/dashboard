import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('getAppSecret', () => {
  it('reads JWT_SECRET', async () => {
    process.env.JWT_SECRET = 'jwt-secret';
    const { getAppSecret } = await import('../../../src/lib/app-secrets.js');
    expect(getAppSecret()).toBe('jwt-secret');
  });

  it('trims surrounding whitespace from a pasted value', async () => {
    process.env.JWT_SECRET = '  spaced-secret  ';
    const { getAppSecret } = await import('../../../src/lib/app-secrets.js');
    expect(getAppSecret()).toBe('spaced-secret');
  });

  it('returns the development fallback when neither is set outside production', async () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const { getAppSecret, FALLBACK_APP_SECRET } = await import('../../../src/lib/app-secrets.js');
    expect(getAppSecret()).toBe(FALLBACK_APP_SECRET);
  });

  it('throws in production when neither is set', async () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    const { getAppSecret } = await import('../../../src/lib/app-secrets.js');
    expect(() => getAppSecret()).toThrow(/JWT_SECRET is required/);
  });
});
