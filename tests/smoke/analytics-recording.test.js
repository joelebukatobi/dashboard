import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ensureDatabaseUrl } from '../../env.js';

// This test hits src/db/index.js directly (not through src/app.js), and that
// module reads process.env.DATABASE_URL at import time. Load it first via a
// dynamic import so ensureDatabaseUrl runs before db/index.js is evaluated.
ensureDatabaseUrl({ scriptName: 'analytics-recording-test' });

const { analyticsService } = await import('../../src/services/analytics.service.js');
const { db, dailyPageViews } = await import('../../src/db/index.js');
const { eq } = await import('drizzle-orm');

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

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
