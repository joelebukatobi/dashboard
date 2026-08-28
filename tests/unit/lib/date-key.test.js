import { describe, it, expect, afterEach } from 'vitest';
import { toDateKey, formatDbDate } from '../../../src/lib/date-key.js';

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe('toDateKey', () => {
  it('returns the local calendar date, not the UTC one', () => {
    // Asia/Tokyo is UTC+9, so an early-morning local time is still the
    // previous day in UTC. toISOString() would return 2026-03-14 here.
    process.env.TZ = 'Asia/Tokyo';
    expect(toDateKey(new Date(2026, 2, 15, 1, 0, 0))).toBe('2026-03-15');
  });

  it('is stable in a negative-offset zone too', () => {
    process.env.TZ = 'America/New_York';
    expect(toDateKey(new Date(2026, 2, 15, 23, 0, 0))).toBe('2026-03-15');
  });
});

describe('formatDbDate', () => {
  // mysql2 hands back a DATE column as midnight UTC. Reading it with local
  // getters shifts it back a day in any negative-offset zone — a row stored
  // as Wednesday 26 August renders as "Tue, Aug 25" in America/New_York.
  const storedDate = new Date('2026-08-26T00:00:00.000Z');

  it('reads back the stored calendar date in a negative-offset zone', () => {
    process.env.TZ = 'America/New_York';
    expect(formatDbDate(storedDate, { month: 'short', day: 'numeric' })).toBe('Aug 26');
    expect(formatDbDate(storedDate, { weekday: 'short' })).toBe('Wed');
  });

  it('reads back the same date in a positive-offset zone', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(formatDbDate(storedDate, { month: 'short', day: 'numeric' })).toBe('Aug 26');
  });

  it('accepts the string form a driver may return', () => {
    expect(formatDbDate('2026-08-26', { month: 'short', day: 'numeric' })).toBe('Aug 26');
  });
});
