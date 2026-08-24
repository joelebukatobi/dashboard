// src/admin/routes/manifest.js
// Resolves admin route files to their Fastify registration prefixes.
//
// Fork boundary: dashboard owns this file. A fork adds routes by dropping
// files into src/admin/routes/project/ and, if a route needs a prefix that
// breaks the `<name> -> /admin/<name>` convention, by editing
// src/admin/routes/project/prefixes.js. Neither requires touching this file.

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, 'project');

/**
 * Route files registered outside adminPlugin. Autoloading these would
 * double-register them and crash on duplicate paths.
 * - auth: registered by src/admin/auth-plugin.js at /admin/auth
 * - setup: registered by src/app.js before the setup-check middleware
 */
export const EXCLUDED_PAGE_ROUTES = new Set(['auth', 'setup']);

/** Admin page prefixes that break the `<name> -> /admin/<name>` convention. */
export const PAGE_PREFIX_OVERRIDES = {
  dashboard: '/admin',
  comments: '/admin/posts/:postId/comments',
  images: '/admin/media/images',
  videos: '/admin/media/videos',
  albums: '/admin/media/albums',
};

/** API prefixes that break the `<name> -> /api/v1/<name>` convention. */
export const API_PREFIX_OVERRIDES = {
  comments: '/api/v1',
  subscribers: '/api/v1',
  settings: '/api/v1',
};

/** `posts.routes.js` -> `posts` */
export function routeName(fileName) {
  return fileName.replace(/\.routes\.js$/, '');
}

/** Override wins; otherwise `<base>/<name>`. */
export function resolvePrefix(name, base, overrides = {}) {
  return overrides[name] ?? `${base}/${name}`;
}

/** Sorted `*.routes.js` file names in `dir`, or [] when `dir` does not exist. */
export function listRouteFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.routes.js'))
    .sort();
}

function buildManifest({ dir, base, overrides, exclude = new Set() }) {
  return listRouteFiles(dir)
    .map((file) => ({ file, name: routeName(file) }))
    .filter(({ name }) => !exclude.has(name))
    .map(({ file, name }) => ({
      name,
      file,
      url: pathToFileURL(join(dir, file)).href,
      prefix: resolvePrefix(name, base, overrides),
    }));
}

export function buildPageManifest(extraOverrides = {}) {
  return buildManifest({
    dir: HERE,
    base: '/admin',
    overrides: { ...PAGE_PREFIX_OVERRIDES, ...extraOverrides },
    exclude: EXCLUDED_PAGE_ROUTES,
  });
}

export function buildApiManifest(extraOverrides = {}) {
  return buildManifest({
    dir: join(HERE, 'api'),
    base: '/api/v1',
    overrides: { ...API_PREFIX_OVERRIDES, ...extraOverrides },
  });
}

export function buildProjectManifest(extraOverrides = {}) {
  return buildManifest({
    dir: PROJECT_DIR,
    base: '/admin',
    overrides: extraOverrides,
  });
}
