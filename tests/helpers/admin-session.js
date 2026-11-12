// Shared by tests that need an authenticated admin.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createSigner } from 'fast-jwt';
import { eq } from 'drizzle-orm';
import { db, users } from '../../src/db/index.js';
import { getAppSecret } from '../../src/lib/app-secrets.js';
import { authService } from '../../src/services/auth.service.js';

/**
 * Finds any existing ADMIN-role user (works against dashboard's own seeded
 * database) or creates a throwaway one (works against an empty, freshly
 * migrated fork database that has no seed yet, or a seed with a different
 * admin email). Returns the user plus a `cleanup()` that removes it if, and
 * only if, this call created it.
 */
export async function getOrCreateTestAdmin() {
  const [existing] = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
  if (existing) return { user: existing, cleanup: async () => {} };

  const email = `test-admin-${crypto.randomUUID()}@fixture.local`;
  const password = await bcrypt.hash('Admin@123', 10);
  await db.insert(users).values({
    firstName: 'Test',
    lastName: 'Admin',
    email,
    password,
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  const [created] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return {
    user: created,
    cleanup: async () => {
      await db.delete(users).where(eq(users.id, created.id));
    },
  };
}

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
