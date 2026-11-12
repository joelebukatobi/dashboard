import { describe, it, expect } from 'vitest';
import { formatSiteDate } from '../../../src/lib/site-dates.js';

describe('formatSiteDate', () => {
  const date = '2026-03-05T00:00:00Z';

  it('renders DD/MM/YYYY day-first', () => {
    expect(formatSiteDate(date, { dateFormat: 'DD/MM/YYYY', timezone: 'UTC' })).toBe('05/03/2026');
  });

  it('renders MM/DD/YYYY month-first', () => {
    expect(formatSiteDate(date, { dateFormat: 'MM/DD/YYYY', timezone: 'UTC' })).toBe('03/05/2026');
  });

  it('renders YYYY-MM-DD', () => {
    expect(formatSiteDate(date, { dateFormat: 'YYYY-MM-DD', timezone: 'UTC' })).toBe('2026-03-05');
  });

  it('renders MMM DD, YYYY', () => {
    expect(formatSiteDate(date, { dateFormat: 'MMM DD, YYYY', timezone: 'UTC' })).toBe('Mar 5, 2026');
  });

  it('falls back to MM/DD/YYYY for an unknown format', () => {
    expect(formatSiteDate(date, { dateFormat: 'bogus', timezone: 'UTC' })).toBe('03/05/2026');
  });

  it('returns a dash for an invalid date', () => {
    expect(formatSiteDate('not-a-date', { dateFormat: 'DD/MM/YYYY' })).toBe('-');
  });
});
