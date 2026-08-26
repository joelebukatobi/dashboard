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
