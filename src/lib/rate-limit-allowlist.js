/**
 * Paths that must not consume the global request budget.
 * Media grids load many images per page; counting them against HTML/API
 * traffic caused 429s and broken <img> previews under production rate limits.
 * @param {string|undefined|null} url
 * @returns {boolean}
 */
export function isRateLimitExemptPath(url) {
  const pathOnly = String(url || '').split('?', 1)[0];
  return (
    pathOnly.startsWith('/public/') ||
    pathOnly.startsWith('/uploads/') ||
    pathOnly.startsWith('/dist/') ||
    pathOnly === '/favicon.ico' ||
    pathOnly === '/favicon.svg'
  );
}
