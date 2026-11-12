import { describe, it, expect } from 'vitest';
import {
  routeName,
  resolvePrefix,
  buildPageManifest,
  buildApiManifest,
  buildProjectManifest,
  PAGE_PREFIX_OVERRIDES,
  API_PREFIX_OVERRIDES,
} from '../../../src/admin/routes/manifest.js';
import { projectPagePrefixes } from '../../../src/admin/routes/project/prefixes.js';

describe('routeName', () => {
  it('strips the .routes.js suffix', () => {
    expect(routeName('posts.routes.js')).toBe('posts');
  });
});

describe('resolvePrefix', () => {
  it('falls back to base + name when no override exists', () => {
    expect(resolvePrefix('posts', '/admin', {})).toBe('/admin/posts');
  });

  it('prefers an override when one exists', () => {
    expect(resolvePrefix('images', '/admin', { images: '/admin/media/images' }))
      .toBe('/admin/media/images');
  });

  it('allows an override to collapse to the bare base', () => {
    expect(resolvePrefix('settings', '/api/v1', { settings: '/api/v1' }))
      .toBe('/api/v1');
  });
});

describe('buildPageManifest', () => {
  // This is the safety net: it pins every admin page route to the exact
  // prefix src/admin/plugin.js registered before the autoloader existed.
  const EXPECTED = {
    dashboard: '/admin',
    posts: '/admin/posts',
    comments: '/admin/posts/:postId/comments',
    categories: '/admin/categories',
    tags: '/admin/tags',
    users: '/admin/users',
    subscribers: '/admin/subscribers',
    images: '/admin/media/images',
    videos: '/admin/media/videos',
    albums: '/admin/media/albums',
    settings: '/admin/settings',
  };

  it('resolves every admin page route to its historical prefix', () => {
    const actual = Object.fromEntries(
      buildPageManifest().map((entry) => [entry.name, entry.prefix]),
    );
    expect(actual).toEqual(EXPECTED);
  });

  it('excludes auth and setup, which register outside adminPlugin', () => {
    const names = buildPageManifest().map((entry) => entry.name);
    expect(names).not.toContain('auth');
    expect(names).not.toContain('setup');
  });

  it('produces importable file URLs', () => {
    for (const entry of buildPageManifest()) {
      expect(entry.url.startsWith('file://')).toBe(true);
      expect(entry.url.endsWith('.routes.js')).toBe(true);
    }
  });

  it('lets a fork override a prefix without editing core overrides', () => {
    const manifest = buildPageManifest({ posts: '/admin/articles' });
    const posts = manifest.find((entry) => entry.name === 'posts');
    expect(posts.prefix).toBe('/admin/articles');
  });
});

describe('buildApiManifest', () => {
  const EXPECTED = {
    posts: '/api/v1/posts',
    categories: '/api/v1/categories',
    tags: '/api/v1/tags',
    comments: '/api/v1',
    images: '/api/v1/images',
    videos: '/api/v1/videos',
    subscribers: '/api/v1',
    settings: '/api/v1',
  };

  it('resolves every API route to its historical prefix', () => {
    const actual = Object.fromEntries(
      buildApiManifest().map((entry) => [entry.name, entry.prefix]),
    );
    expect(actual).toEqual(EXPECTED);
  });
});

// Runs in forks too: checks the shape of whatever routes a fork adds
// rather than insisting the project directory is empty.
describe('buildProjectManifest', () => {
  const entries = buildProjectManifest(projectPagePrefixes);

  it('resolves each project route to /admin/<name> unless prefixes.js overrides it', () => {
    for (const entry of entries) {
      expect(entry.file).toMatch(/\.routes\.js$/);
      expect(entry.url).toMatch(/^file:/);
      expect(entry.prefix).toBe(projectPagePrefixes[entry.name] ?? `/admin/${entry.name}`);
    }
  });

  it('never reuses a core route prefix, which would crash on registration', () => {
    const corePrefixes = new Set(buildPageManifest(projectPagePrefixes).map((e) => e.prefix));
    for (const entry of entries) expect(corePrefixes.has(entry.prefix)).toBe(false);
  });
});

describe('override tables', () => {
  it('documents only the prefixes that break convention', () => {
    expect(Object.keys(PAGE_PREFIX_OVERRIDES).sort()).toEqual(
      ['albums', 'comments', 'dashboard', 'images', 'videos'],
    );
    expect(Object.keys(API_PREFIX_OVERRIDES).sort()).toEqual(
      ['comments', 'settings', 'subscribers'],
    );
  });
});
