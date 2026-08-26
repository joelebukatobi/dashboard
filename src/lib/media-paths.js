// src/lib/media-paths.js
// Normalize stored media paths to browser-ready /public/... URLs

import path from 'path';

/**
 * True when a URL points at this app on localhost or a loopback address.
 * The admin editor stores absolute URLs, so content authored against a local
 * server carries dead links into production without this.
 * @param {string} value
 * @returns {boolean}
 */
export function isLocalDevMediaUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\//i.test(value.trim());
}

/**
 * Convert a stored media path to a browser URL under /public/.
 * Handles legacy values: public/..., /public/..., uploads/..., /uploads/...
 * @param {string|null|undefined} storedPath
 * @returns {string}
 */
export function toPublicMediaUrl(storedPath) {
  if (!storedPath) return '';

  const value = String(storedPath).trim();
  if (!value) return '';

  if (isLocalDevMediaUrl(value)) {
    try {
      return toPublicMediaUrl(new URL(value).pathname);
    } catch {
      return '';
    }
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/public/')) {
    return value;
  }

  if (value.startsWith('public/')) {
    return `/${value}`;
  }

  if (value.startsWith('/uploads/')) {
    return `/public${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `/public/${value}`;
  }

  return value.startsWith('/') ? value : `/${value}`;
}

/**
 * Best public URL for a media item (prefers thumbnail).
 * @param {{ path?: string, thumbnailPath?: string }|null|undefined} item
 * @returns {string|null}
 */
export function mediaItemPublicUrl(item) {
  if (!item) return null;
  const url = toPublicMediaUrl(item.thumbnailPath || item.path);
  return url || null;
}

/**
 * Rewrite localhost media URLs embedded in post HTML to /public/... paths.
 * The editor can save absolute localhost URLs in <img>/<video>/<source> src
 * attributes; those are dead links once the post is served from anywhere
 * else, so rewrite them to the relative path this app actually serves.
 * @param {string|null|undefined} html
 * @returns {string}
 */
export function rewriteContentMediaUrls(html) {
  if (!html || typeof html !== 'string') return '';

  return html.replace(
    /(<(?:img|source|video)\b[^>]*\ssrc=["'])(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?)(\/[^"']*)(["'])/gi,
    (_, before, _origin, pathname, after) => `${before}${toPublicMediaUrl(pathname)}${after}`,
  );
}

/**
 * Resolve stored media path to an absolute filesystem path.
 * @param {string|null|undefined} storedPath
 * @returns {string|null}
 */
export function resolveMediaFsPath(storedPath) {
  if (!storedPath) return null;

  const rel = String(storedPath).replace(/^\//, '');
  if (rel.startsWith('public/')) {
    return path.join(process.cwd(), rel);
  }
  if (rel.startsWith('uploads/')) {
    return path.join(process.cwd(), 'public', rel);
  }
  return path.join(process.cwd(), rel);
}
