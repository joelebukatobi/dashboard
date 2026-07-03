/**
 * Public pagination limits from site settings.
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * @param {Record<string, unknown>} [siteSettings]
 * @param {number} [requested] - Optional override from query
 */
export function getPublicPageLimit(siteSettings = {}, requested) {
  const fromSettings = Number(siteSettings.postsPerPage) || DEFAULT_LIMIT;
  const base = Math.min(Math.max(fromSettings, 1), MAX_LIMIT);

  if (requested == null || requested === '') return base;

  const n = parseInt(String(requested), 10);
  if (Number.isNaN(n) || n < 1) return base;
  return Math.min(n, MAX_LIMIT);
}
