// Resolve how many media items a page holds.
//
// The honest answer depends on the viewer's window height, which only the
// browser knows. mediaPageFitScript measures the whole rows that fit and
// stores the result in a cookie; this reads it back so the server renders the
// right number first time. An explicit ?limit= still wins, and the fallbacks
// only apply before any measurement has happened.

const MIN = 1;
const MAX = 100;

/** Pre-measurement fallbacks, deliberately small so nothing is clipped. */
const DEFAULTS = { grid: 10, table: 25 };

/**
 * @param {Object} options
 * @param {string|undefined} options.limitParam - ?limit= from the query
 * @param {Record<string, string>} [options.cookies] - request.cookies
 * @param {'grid'|'table'} options.view
 * @returns {number}
 */
export function resolveMediaPageSize({ limitParam, cookies = {}, view }) {
  const viewMode = view === 'table' ? 'table' : 'grid';

  const candidates = [limitParam, cookies[`media_page_size_${viewMode}`], DEFAULTS[viewMode]];

  for (const candidate of candidates) {
    const parsed = parseInt(candidate, 10);
    if (Number.isFinite(parsed) && parsed >= MIN) {
      return Math.min(MAX, parsed);
    }
  }

  return DEFAULTS[viewMode];
}
