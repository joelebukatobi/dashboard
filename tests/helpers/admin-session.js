// Shared by tests that sign a session JWT for an admin user.
import crypto from 'node:crypto';
import { createSigner } from 'fast-jwt';
import { getAppSecret } from '../../src/lib/app-secrets.js';
import { authService } from '../../src/services/auth.service.js';

/**
 * Signs a session JWT and persists it, with a unique jti so two test files
 * signing in within the same second don't produce the same token and collide
 * on the sessions table's unique `token` column.
 */
export async function createTestSession(user, { rememberMe = false } = {}) {
  const token = createSigner({ key: getAppSecret() })({
    userId: user.id,
    email: user.email,
    role: user.role,
    jti: crypto.randomUUID(),
  });
  await authService.createSession(user.id, rememberMe, token);
  return token;
}
