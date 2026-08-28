import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// This project migrated from PostgreSQL to MySQL. Drizzle exposes a different
// upsert API per dialect: onConflictDoNothing/onConflictDoUpdate exist on the
// Postgres and SQLite builders, while MySQL has only onDuplicateKeyUpdate.
// Calling the wrong one is a plain TypeError at the moment the line executes —
// it produces no SQL and cannot be caught by type checking.
//
// Three such calls survived the migration in simulation and mock-seeding paths
// that nothing automated exercises, so they sat broken while CI stayed green.

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const POSTGRES_ONLY_UPSERT = /\.onConflictDo(Nothing|Update)\s*\(/;

describe('drizzle dialect', () => {
  it('uses no Postgres-only upsert API outside dialect-guarded code', () => {
    const offenders = [];

    for (const file of [...walk('src'), ...walk('scripts')]) {
      const source = readFileSync(file, 'utf8');
      if (!POSTGRES_ONLY_UPSERT.test(source)) continue;

      // scripts/seed.js deliberately supports both dialects and branches on
      // DATABASE_URL before choosing an upsert, so its Postgres path is
      // unreachable on MySQL rather than broken.
      if (source.includes("startsWith('mysql')")) continue;

      offenders.push(file);
    }

    expect(
      offenders,
      'these files call onConflictDoNothing/onConflictDoUpdate, which do not ' +
        'exist on drizzle\'s MySQL builder and throw TypeError when reached',
    ).toEqual([]);
  });
});
