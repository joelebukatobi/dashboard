// src/lib/date-key.js
// Shared local-date-key helper. Pure — no DB import — so scripts and services
// that only need a date key don't have to pull in the database pool.

/**
 * Local-midnight YYYY-MM-DD key for the daily counter.
 * Built from local date components rather than `toISOString()`, which
 * converts to UTC and would shift the key back a day for any positive
 * UTC offset (e.g. Asia/Tokyo) — do not reintroduce it.
 * @param {Date} [date]
 * @returns {string}
 */
export function toDateKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a value from a MySQL DATE column for display.
 *
 * mysql2 returns a DATE as a Date pinned to midnight UTC, with no time and no
 * zone of its own. Reading it with local getters shifts it back a day for any
 * negative UTC offset — a row stored as Wednesday 26 August renders as
 * "Tue, Aug 25" in America/New_York. Pinning the formatter to UTC reads back
 * the calendar date that was actually stored.
 *
 * Only for DATE columns. Timestamps such as createdAt carry a real instant and
 * should be formatted in the viewer's local zone.
 *
 * @param {Date|string} value
 * @param {Intl.DateTimeFormatOptions} options
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDbDate(value, options, locale = 'en-US') {
  return new Date(value).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}
