import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION_FILE = path.join(__dirname, '../../dist/asset-version.txt');

let cachedVersion;

/**
 * Deploy/build writes dist/asset-version.txt (git SHA). Browsers cache
 * /dist/css/*.css aggressively; appending ?v= forces a fresh fetch after deploy.
 */
export function getAssetVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  if (process.env.APP_ASSET_VERSION) {
    cachedVersion = process.env.APP_ASSET_VERSION.trim();
    return cachedVersion;
  }

  try {
    cachedVersion = readFileSync(VERSION_FILE, 'utf8').trim();
    if (cachedVersion) {
      return cachedVersion;
    }
  } catch {
    // Local dev without a deploy stamp
  }

  cachedVersion = 'dev';
  return cachedVersion;
}

export function assetUrl(assetPath) {
  const base = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${encodeURIComponent(getAssetVersion())}`;
}
