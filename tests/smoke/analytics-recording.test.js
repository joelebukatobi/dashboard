import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { ensureDatabaseUrl } from '../../env.js';

// This test hits src/db/index.js directly (not through src/app.js), and that
// module reads process.env.DATABASE_URL at import time. Load it first via a
// dynamic import so ensureDatabaseUrl runs before db/index.js is evaluated.
ensureDatabaseUrl({ scriptName: 'analytics-recording-test' });

const { analyticsService, toDateKey } = await import('../../src/services/analytics.service.js');
const { db, dailyPageViews } = await import('../../src/db/index.js');
const { eq } = await import('drizzle-orm');

// Reuse the service's own date-key logic instead of re-deriving it here —
// a duplicate implementation is exactly what let the toISOString() bug slip
// through unnoticed.
const todayKey = () => toDateKey();

// dailyPageViews.date round-trips through mysql2 as a UTC-midnight Date
// object representing a plain calendar date (no timezone attached) — reading
// it back with toDateKey()'s *local* getters would shift it a day for any
// negative UTC offset. Use UTC components here; that's the correct read for
// a value that was never a local instant to begin with.
const dbDateKey = (date) => new Date(date).toISOString().split('T')[0];

// These tests need today's counter to start from a known value, but locally
// that row belongs to the developer's own database and holds real views.
// Snapshot it, work on a clean row, and put it back — so the suite is
// non-destructive wherever it runs rather than only against a throwaway CI
// database.
let savedRow = null;

// Snapshot exactly once, before any test has had a chance to write. Doing it
// in beforeEach would capture a row a previous test had just created and
// restore that instead of the developer's real data.
beforeAll(async () => {
  const [existing] = await db
    .select()
    .from(dailyPageViews)
    .where(eq(dailyPageViews.date, todayKey()));
  savedRow = existing ?? null;
});

async function clearTodaysRow() {
  await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
}

afterAll(async () => {
  await clearTodaysRow();
  if (savedRow) await db.insert(dailyPageViews).values(savedRow);
});

describe('recordDailyView', () => {
  beforeEach(clearTodaysRow);

  it('creates a row for today with a count of one', async () => {
    await analyticsService.recordDailyView();

    const [row] = await db
      .select()
      .from(dailyPageViews)
      .where(eq(dailyPageViews.date, todayKey()));

    expect(row).toBeDefined();
    expect(Number(row.totalViews)).toBe(1);
  });

  it('increments the existing row rather than inserting a duplicate', async () => {
    await analyticsService.recordDailyView();
    await analyticsService.recordDailyView();
    await analyticsService.recordDailyView();

    const rows = await db
      .select()
      .from(dailyPageViews)
      .where(eq(dailyPageViews.date, todayKey()));

    expect(rows).toHaveLength(1);
    expect(Number(rows[0].totalViews)).toBe(3);
  });
});

describe('toDateKey', () => {
  it('uses local date components, not UTC, for positive-offset zones', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';

    try {
      // Local early morning in Tokyo — past local midnight but still the
      // previous day in UTC, so this only passes if toDateKey reads local
      // getFullYear/Month/Date instead of converting through toISOString()
      // (bare or with setHours(0,0,0,0)), which would read back the previous
      // day for any positive UTC offset.
      const localDate = new Date(2026, 2, 15, 1, 0, 0);
      expect(toDateKey(localDate)).toBe('2026-03-15');
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});

describe('getTrafficData', () => {
  beforeEach(clearTodaysRow);

  it('returns exactly one entry for today after recordDailyView() runs', async () => {
    await analyticsService.recordDailyView();

    const data = await analyticsService.getTrafficData({ days: 30 });
    const todaysEntries = data.filter(
      (entry) => dbDateKey(entry.date) === todayKey(),
    );

    expect(todaysEntries).toHaveLength(1);
    expect(Number(todaysEntries[0].views)).toBe(1);
  });
});
