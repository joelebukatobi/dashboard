// Content Security Policy directives, with room for a fork to add its own.
//
// A fork that embeds or loads something from another site (a map, a video, a
// font) adds those sources in a fork-owned src/site/csp.js:
//
//   export default { frameSrc: ['https://maps.google.com'] };
//
// Its sources are added to dashboard's, never replacing them. A directive
// dashboard doesn't set starts from default-src, so adding frameSrc still
// keeps 'self'. Dashboard ships no src/site/csp.js.
import { existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

export const BASE_CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  // Helmet defaults script-src-attr to 'none', which blocks inline
  // event handler attributes. 'unsafe-inline' on script-src permits
  // inline <script> blocks but not onclick= and friends — a separate
  // directive governs those. The admin templates use ~94 inline
  // handlers, so without this every one of them silently does
  // nothing in production while working fine in development.
  scriptSrcAttr: ["'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
};

/**
 * @param {Record<string, string[]>} base
 * @param {Record<string, string[]>} extra
 * @returns {Record<string, string[]>}
 */
export function mergeCspDirectives(base, extra = {}) {
  const out = { ...base };
  for (const [key, sources] of Object.entries(extra || {})) {
    if (!Array.isArray(sources)) continue;
    const start = out[key] ?? base.defaultSrc ?? [];
    out[key] = [...new Set([...start, ...sources])];
  }
  return out;
}

const SITE_CSP = new URL('../site/csp.js', import.meta.url);

/** Dashboard's directives plus the fork's src/site/csp.js, if it has one. */
export async function cspDirectives() {
  if (!existsSync(fileURLToPath(SITE_CSP))) return BASE_CSP_DIRECTIVES;
  const { default: extra } = await import(pathToFileURL(fileURLToPath(SITE_CSP)).href);
  return mergeCspDirectives(BASE_CSP_DIRECTIVES, extra);
}
