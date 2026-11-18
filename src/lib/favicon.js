// Where a page should point its <link rel="icon">.
//
// Always the /favicon.svg route, never the stored upload path: the route
// resolves the configured icon and falls back to the bundled one when that
// file is missing, so a setting left pointing at a deleted upload still gets
// an icon instead of a broken request.
//
// The stored path is folded into a ?v= instead. Browsers cache favicons hard
// and keep showing the old one well past a reload, so without this a newly
// uploaded icon would not reach a tab that already has one.

import { createHash } from 'crypto';

/**
 * @param {string|undefined|null} siteIcon - the siteIcon setting
 * @returns {string} href for <link rel="icon">
 */
export function faviconHref(siteIcon) {
  const value = String(siteIcon || '');
  if (!value || value === '/favicon.svg') return '/favicon.svg';

  const version = createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `/favicon.svg?v=${version}`;
}
