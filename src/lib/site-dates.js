/**
 * Date formatting driven by site settings.
 */

// Intl.DateTimeFormat's part ORDER is set by locale, not by the key order
// in its options object -- 'en-US' always renders month-first numeric dates
// regardless of which keys you pass, which silently broke every format
// here except MM/DD/YYYY and MMM DD, YYYY (both already month-first in
// en-US). Pull the numeric parts out with formatToParts and assemble the
// string ourselves so the configured order is actually honored.
const FORMATTERS = {
  'MM/DD/YYYY': (p) => `${p.month}/${p.day}/${p.year}`,
  'DD/MM/YYYY': (p) => `${p.day}/${p.month}/${p.year}`,
  'YYYY-MM-DD': (p) => `${p.year}-${p.month}-${p.day}`,
  'MMM DD, YYYY': (p) => `${p.monthShort} ${Number(p.day)}, ${p.year}`,
};

function getDateParts(d, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const monthShort = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'short' }).format(d);
  return { year: byType.year, month: byType.month, day: byType.day, monthShort };
}

/**
 * @param {Date|string} date
 * @param {Record<string, unknown>} [siteSettings]
 */
export function formatSiteDate(date, siteSettings = {}) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';

  const dateFormat = String(siteSettings.dateFormat || 'MM/DD/YYYY');
  const timezone = String(siteSettings.timezone || 'UTC');
  const render = FORMATTERS[dateFormat] || FORMATTERS['MM/DD/YYYY'];

  try {
    return render(getDateParts(d, timezone));
  } catch {
    return render(getDateParts(d, 'UTC'));
  }
}
