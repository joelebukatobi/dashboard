/**
 * Site icon upload — stored separately from media library.
 */

import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/site');

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const EXT_BY_TYPE = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

/**
 * @param {{ mimetype: string, toBuffer: () => Promise<Buffer> }} file
 * @returns {Promise<string>} Public path
 */
export async function saveSiteIconUpload(file) {
  const mimetype = file.mimetype;
  if (!ALLOWED_TYPES.has(mimetype)) {
    throw new Error('Invalid file type. Use PNG, JPEG, WebP, SVG, or ICO.');
  }

  const buffer = await file.toBuffer();
  if (buffer.length > 2 * 1024 * 1024) {
    throw new Error('Icon must be 2MB or smaller.');
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = EXT_BY_TYPE[mimetype] || '.png';
  const filename = `site-icon-${Date.now()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/public/uploads/site/${filename}`;
}

/**
 * @param {string} iconPath - Path from media library
 */
export function validateMediaIconPath(iconPath) {
  if (!iconPath || typeof iconPath !== 'string') {
    throw new Error('No image selected.');
  }
  if (!iconPath.startsWith('/public/uploads/')) {
    throw new Error('Invalid image path.');
  }
  return iconPath;
}
