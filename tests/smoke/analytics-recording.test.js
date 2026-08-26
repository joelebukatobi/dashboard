import { describe, it, expect, beforeEach, afterAll } from 'vitest';
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

describe('recordDailyView', () => {
  beforeEach(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

  afterAll(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

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
      // Local noon in Tokyo — nowhere near a UTC day boundary either way,
      // so this only passes if toDateKey reads local getFullYear/Month/Date
      // instead of converting through toISOString() (which would read back
      // the previous day for any positive UTC offset).
      const localDate = new Date(2026, 2, 15, 12, 0, 0);
      expect(toDateKey(localDate)).toBe('2026-03-15');
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('getTrafficData', () => {
  beforeEach(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

  afterAll(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

  it('returns exactly one entry for today after recordDailyView() runs', async () => {
    await analyticsService.recordDailyView();

    const data = await analyticsService.getTrafficData({ days: 30 });
    const todaysEntries = data.filter(
      (entry) => toDateKey(entry.date) === todayKey(),
    );

    expect(todaysEntries).toHaveLength(1);
    expect(Number(todaysEntries[0].views)).toBe(1);
  });
});
