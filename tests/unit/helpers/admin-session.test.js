import { describe, it, expect, afterAll } from 'vitest';

const { ensureDatabaseUrl } = await import('../../../env.js');
ensureDatabaseUrl({ scriptName: 'admin-session-helper.test' });

const { db, users, sessions } = await import('../../../src/db/index.js');
const { eq } = await import('drizzle-orm');
const { createTestSession } = await import('../../helpers/admin-session.js');

describe('createTestSession', () => {
  const createdSessionIds = [];

  afterAll(async () => {
    for (const id of createdSessionIds) {
      await db.delete(sessions).where(eq(sessions.id, id));
    }
  });

  it('gives two sessions created back-to-back for the same user distinct tokens', async () => {
    const [user] = await db.select().from(users).limit(1);
    if (!user) return;

    const tokenA = await createTestSession(user);
    const tokenB = await createTestSession(user);

    expect(tokenA).not.toBe(tokenB);

    const [sessionA] = await db.select().from(sessions).where(eq(sessions.token, tokenA)).limit(1);
    const [sessionB] = await db.select().from(sessions).where(eq(sessions.token, tokenB)).limit(1);
    expect(sessionA).toBeTruthy();
    expect(sessionB).toBeTruthy();
    createdSessionIds.push(sessionA.id, sessionB.id);
  });
});
