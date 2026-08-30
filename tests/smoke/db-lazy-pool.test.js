import { describe, it, expect } from 'vitest';
import { ensureDatabaseUrl } from '../../env.js';

// The pool used to be built at module evaluation from process.env.DATABASE_URL.
// ESM evaluates a module's whole import graph before the importing module's
// body runs, and src/app.js populates DATABASE_URL in its body — so any static
// import reaching the db module from app.js built a pool with `uri: undefined`
// and every query failed as though the database were down.
//
// Building it on first use, and discarding one built without a connection
// string, removes the ordering hazard. This reproduces the ordering that broke:
// touch the client first, configure second.

describe('database pool construction', () => {
  it('recovers when it is used before DATABASE_URL is loaded', async () => {
    // vitest does not inherit DATABASE_URL; the app loads it from .env files.
    // Resolve it first so there is a real value to restore.
    ensureDatabaseUrl({ scriptName: 'db-lazy-pool.test' });
    const realUrl = process.env.DATABASE_URL;
    expect(realUrl, 'this test needs a resolvable database url').toBeTruthy();

    delete process.env.DATABASE_URL;

    const dbModule = await import('../../src/db/index.js');

    // Touching the client is what builds the pool. Doing it now builds one
    // with no connection string — the failure this guards against.
    void dbModule.db.select;

    process.env.DATABASE_URL = realUrl;

    // The unusable pool must be discarded rather than kept for the process.
    expect(await dbModule.testConnection({ quiet: true })).toBe(true);

    const { posts } = await import('../../src/db/schema.js');
    const rows = await dbModule.db.select().from(posts).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
