/**
 * Date formatting driven by site settings.
 */

const FORMAT_OPTIONS = {
  'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
  'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
  'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
  'MMM DD, YYYY': { month: 'short', day: 'numeric', year: 'numeric' },
};

/**
 * @param {Date|string} date
 * @param {Record<string, unknown>} [siteSettings]
 */
export function formatSiteDate(date, siteSettings = {}) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';

  const dateFormat = String(siteSettings.dateFormat || 'MM/DD/YYYY');
  const timezone = String(siteSettings.timezone || 'UTC');
  const options = FORMAT_OPTIONS[dateFormat] || FORMAT_OPTIONS['MM/DD/YYYY'];

  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(d);
  }
}
