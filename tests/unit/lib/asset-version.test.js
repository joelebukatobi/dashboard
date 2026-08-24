import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');
const versionFile = path.join(distDir, 'asset-version.txt');

describe('asset-version', () => {
  beforeEach(() => {
    vi.resetModules();
    mkdirSync(distDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(versionFile, { force: true });
    } catch {
      // ignore
    }
    delete process.env.APP_ASSET_VERSION;
  });

  it('appends deploy version from dist/asset-version.txt', async () => {
    writeFileSync(versionFile, 'abc123def\n');
    const { assetUrl } = await import('../../../src/lib/asset-version.js');

    expect(assetUrl('/dist/css/app.css')).toBe('/dist/css/app.css?v=abc123def');
  });

  it('prefers APP_ASSET_VERSION over the version file', async () => {
    writeFileSync(versionFile, 'from-file\n');
    process.env.APP_ASSET_VERSION = 'from-env';
    const { assetUrl } = await import('../../../src/lib/asset-version.js');

    expect(assetUrl('/dist/css/admin.css')).toBe('/dist/css/admin.css?v=from-env');
  });

  it('falls back to dev when no version file exists', async () => {
    const { assetUrl } = await import('../../../src/lib/asset-version.js');

    expect(assetUrl('/dist/css/app.css')).toBe('/dist/css/app.css?v=dev');
  });
});
