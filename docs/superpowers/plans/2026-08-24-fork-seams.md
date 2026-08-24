# Fork & Downstream Sync Seams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard forkable — a fork adds features by creating files, never by editing files dashboard also edits, so `git merge upstream` stays clean.

**Architecture:** Four independent seams. Hardcoded lists (admin page routes, API routes, schema tables, sidebar nav, migration sequence) each gain an append point that a fork writes to. No plugin system, no package extraction — every change is a refactor of an existing list into a list plus an extension slot.

**Tech Stack:** Node 20 ESM, Fastify 4, fastify-html, Drizzle ORM (mysql2), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-fork-downstream-sync-design.md`

## Global Constraints

- ESM only. Every import needs the `.js` extension. No CommonJS.
- No new runtime dependencies. Use `node:fs`, `node:path`, `node:url`.
- Behavior must not change. These are refactors; every route keeps its exact
  current path, and every table keeps its exact current definition.
- Files dashboard ships as fork extension points must exist and be empty (or
  export an empty value), never be absent — a fork should uncomment, not create
  from scratch.
- `npm run check` must pass at the end of every task.
- Tests requiring a database live in `tests/smoke/`. Tests in `tests/unit/`
  must never touch the database.

---

## File Structure

**Created:**
- `src/admin/routes/manifest.js` — pure resolution of route file names to registration prefixes, plus directory listing. No Fastify, no DB.
- `src/admin/routes/project/.gitkeep` — fork's admin route directory, empty upstream.
- `src/admin/routes/project/prefixes.js` — fork's prefix overrides, exports `{}` upstream.
- `src/admin/nav.project.js` — fork's sidebar items, exports `[]` upstream.
- `src/db/schema/core.js` — current schema contents, moved.
- `src/db/schema/project.js` — fork's tables, exports nothing upstream.
- `tests/unit/admin/route-manifest.test.js` — the safety net for Seam 1.
- `tests/unit/admin/nav-project.test.js` — nav injection rendering.
- `docs/forking.md` — fork bootstrap and pull ritual.
- `.gitattributes.fork` — template a fork renames to `.gitattributes`.

**Modified:**
- `src/admin/plugin.js:40-51` — eleven explicit registers become an autoload loop.
- `src/app.js:189-196` — eight explicit API registers become an autoload loop.
- `src/db/schema.js` — 456 lines become a two-line barrel.
- `src/admin/templates/partials/sidebar.js` — one interpolation slot added before `</nav>`.
- `scripts/migrate.js` — runs the project migration folder after core.
- `docs/README.md` — link to `docs/forking.md`.

**Deleted:**
- `src/db/migrations/0003_add_setup_tokens.sql` — orphaned, absent from the journal.

---

### Task 1: Route manifest module

Pure functions that decide where each route file registers. No Fastify wiring
yet — this task only builds and proves the mapping. Task 2 consumes it.

The mapping must reproduce the current registrations exactly:

| File | Registers at |
|---|---|
| `dashboard.routes.js` | `/admin` |
| `posts.routes.js` | `/admin/posts` |
| `comments.routes.js` | `/admin/posts/:postId/comments` |
| `categories.routes.js` | `/admin/categories` |
| `tags.routes.js` | `/admin/tags` |
| `users.routes.js` | `/admin/users` |
| `subscribers.routes.js` | `/admin/subscribers` |
| `images.routes.js` | `/admin/media/images` |
| `videos.routes.js` | `/admin/media/videos` |
| `albums.routes.js` | `/admin/media/albums` |
| `settings.routes.js` | `/admin/settings` |

`auth.routes.js` and `setup.routes.js` are excluded — they are registered
elsewhere (`src/admin/auth-plugin.js` at `/admin/auth`, `src/app.js:90` for
setup, which must load before the setup-check middleware). Autoloading them
would double-register and crash on duplicate route paths.

API files map to `/api/v1/<name>` except `comments`, `subscribers`, and
`settings`, which register at bare `/api/v1`.

**Files:**
- Create: `src/admin/routes/manifest.js`
- Create: `src/admin/routes/project/.gitkeep`
- Create: `src/admin/routes/project/prefixes.js`
- Test: `tests/unit/admin/route-manifest.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `EXCLUDED_PAGE_ROUTES: Set<string>`
  - `PAGE_PREFIX_OVERRIDES: Record<string, string>`
  - `API_PREFIX_OVERRIDES: Record<string, string>`
  - `routeName(fileName: string): string`
  - `resolvePrefix(name: string, base: string, overrides: Record<string,string>): string`
  - `listRouteFiles(dir: string): string[]`
  - `buildPageManifest(overrides?: Record<string,string>): Array<{name: string, file: string, url: string, prefix: string}>`
  - `buildApiManifest(): Array<{name: string, file: string, url: string, prefix: string}>`
  - `buildProjectManifest(overrides?: Record<string,string>): Array<{name: string, file: string, url: string, prefix: string}>`

  `url` is an absolute `file://` href suitable for dynamic `import()`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin/route-manifest.test.js`:

```js
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

describe('buildProjectManifest', () => {
  it('is empty in dashboard, where the project directory holds no routes', () => {
    expect(buildProjectManifest()).toEqual([]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/admin/route-manifest.test.js`
Expected: FAIL — `Failed to resolve import ".../src/admin/routes/manifest.js"`

- [ ] **Step 3: Write minimal implementation**

Create `src/admin/routes/manifest.js`:

```js
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
```

Create `src/admin/routes/project/prefixes.js`:

```js
// src/admin/routes/project/prefixes.js
// Fork-owned. Dashboard ships this empty.
//
// Add an entry only when a project route needs a prefix that breaks the
// `<name> -> /admin/<name>` convention, e.g.:
//
//   export const projectPagePrefixes = {
//     departments: '/admin/org/departments',
//   };

export const projectPagePrefixes = {};
export const projectApiPrefixes = {};
```

Create `src/admin/routes/project/.gitkeep` as an empty file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/admin/route-manifest.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/admin/routes/manifest.js src/admin/routes/project tests/unit/admin/route-manifest.test.js
git commit -m "feat(fork): add admin route manifest with project extension point"
```

---

### Task 2: Wire the autoloader

Replace the two hardcoded register lists with loops over the manifest. Task 1's
test is what proves this is behavior-preserving — it pins each prefix to the
value the hardcoded list used.

**Files:**
- Modify: `src/admin/plugin.js:40-51`
- Modify: `src/app.js:188-196`
- Test: `tests/smoke/app.test.js` (add route-registration assertions)

**Interfaces:**
- Consumes: `buildPageManifest`, `buildApiManifest`, `buildProjectManifest` from Task 1; `projectPagePrefixes`, `projectApiPrefixes` from `src/admin/routes/project/prefixes.js`.
- Produces: no new exports. `adminPlugin` and `app` keep their current signatures.

- [ ] **Step 1: Write the failing test**

Append to `tests/smoke/app.test.js`, inside the existing `describe('app smoke')`
block (it already has `server` in scope from `beforeAll`):

```js
  it('registers every admin page route under its expected prefix', () => {
    const tree = server.printRoutes({ commonPrefix: false });

    for (const path of [
      '/admin',
      '/admin/posts',
      '/admin/posts/:postId/comments',
      '/admin/categories',
      '/admin/tags',
      '/admin/users',
      '/admin/subscribers',
      '/admin/media/images',
      '/admin/media/videos',
      '/admin/media/albums',
      '/admin/settings',
      '/admin/auth/login',
    ]) {
      expect(tree, `missing route ${path}`).toContain(path);
    }
  });

  it('registers every API route under its expected prefix', () => {
    const tree = server.printRoutes({ commonPrefix: false });

    for (const path of [
      '/api/v1/posts',
      '/api/v1/categories',
      '/api/v1/tags',
      '/api/v1/images',
      '/api/v1/videos',
      '/api/v1/settings',
    ]) {
      expect(tree, `missing route ${path}`).toContain(path);
    }
  });
```

Note: this suite boots the real app, so it needs a reachable database — the
`site-settings` plugin loads the settings map in an `onReady` hook. Run it with
your dev database up.

- [ ] **Step 2: Run test to verify it passes against the current code**

Run: `npx vitest run tests/smoke/app.test.js`
Expected: PASS. This is deliberate — the test characterizes existing behavior
*before* the refactor, so a regression in Step 3 turns it red. If it fails now,
stop: the expected-path list is wrong and must be corrected against
`src/admin/plugin.js` before touching anything.

- [ ] **Step 3: Replace the hardcoded lists**

In `src/admin/plugin.js`, add to the imports at the top:

```js
import { buildPageManifest, buildProjectManifest } from './routes/manifest.js';
import { projectPagePrefixes } from './routes/project/prefixes.js';
```

Then replace the eleven `await fastify.register(import('./routes/...'))` lines
at the end of `adminPlugin` with:

```js
  // Core admin pages, autoloaded from src/admin/routes/*.routes.js.
  for (const route of buildPageManifest(projectPagePrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }

  // Fork-owned admin pages, autoloaded from src/admin/routes/project/.
  for (const route of buildProjectManifest(projectPagePrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }
```

In `src/app.js`, add to the imports at the top:

```js
import { buildApiManifest } from './admin/routes/manifest.js';
import { projectApiPrefixes } from './admin/routes/project/prefixes.js';
```

Then replace lines 188-196 (the `// Register public API routes (v1)` comment
and the eight registers beneath it) with:

```js
  // Public API routes (v1), autoloaded from src/admin/routes/api/*.routes.js.
  for (const route of buildApiManifest(projectApiPrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }
```

Leave `src/app.js:90` (`setup.routes.js`) exactly as it is — it must register
before the setup-check middleware, and `EXCLUDED_PAGE_ROUTES` keeps the
autoloader off it.

- [ ] **Step 4: Run the full suite to verify nothing moved**

Run: `npm run check`
Expected: PASS. The smoke assertions from Step 1 confirm every path survived
the refactor; the Task 1 unit test confirms the mapping itself.

- [ ] **Step 5: Commit**

```bash
git add src/admin/plugin.js src/app.js tests/smoke/app.test.js
git commit -m "refactor(fork): autoload admin and API routes from manifest"
```

---

### Task 3: Split the schema, keep the barrel in place

`src/db/schema.js` stays at its current path as a two-line barrel, so none of
the existing `import ... from '.../db/schema.js'` statements change and
`drizzle.config.js` keeps working untouched.

**Files:**
- Create: `src/db/schema/core.js` (current contents of `src/db/schema.js`, moved verbatim)
- Create: `src/db/schema/project.js`
- Modify: `src/db/schema.js` (becomes a barrel)
- Test: `tests/unit/schemas/schema-barrel.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/db/schema.js` re-exports everything from both files. Every
  existing export name (`users`, `posts`, `postsRelations`, `userRoleEnum`,
  `now`, and the rest) keeps its current import path.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/schemas/schema-barrel.test.js`:

```js
import { describe, it, expect } from 'vitest';
import * as barrel from '../../../src/db/schema.js';
import * as core from '../../../src/db/schema/core.js';

describe('schema barrel', () => {
  it('re-exports every core table and helper', () => {
    for (const name of Object.keys(core)) {
      expect(barrel[name], `barrel is missing ${name}`).toBe(core[name]);
    }
  });

  it('still exports the tables the app imports by name', () => {
    for (const name of [
      'users', 'sessions', 'passwordResets', 'categories', 'tags',
      'posts', 'postTags', 'postLikes', 'comments', 'mediaItems',
      'albums', 'settings', 'activities', 'analyticsEvents',
      'dailyPageViews', 'subscribers', 'oauthAccounts', 'setupTokens',
      'now',
    ]) {
      expect(barrel[name], `missing export ${name}`).toBeDefined();
    }
  });

  it('exposes the project schema module as an extension point', async () => {
    const project = await import('../../../src/db/schema/project.js');
    expect(project).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/schemas/schema-barrel.test.js`
Expected: FAIL — `Failed to resolve import ".../src/db/schema/core.js"`

- [ ] **Step 3: Move the file and write the barrel**

```bash
mkdir -p src/db/schema
git mv src/db/schema.js src/db/schema/core.js
```

Change the first line of `src/db/schema/core.js` from `// src/db/schema.js` to
`// src/db/schema/core.js`. Change nothing else in it.

Create `src/db/schema/project.js`:

```js
// src/db/schema/project.js
// Fork-owned. Dashboard ships this empty.
//
// Fork-only tables live here. Importing from ./core.js is fine — that is
// reading, not editing:
//
//   import { mysqlTable, varchar } from 'drizzle-orm/mysql-core';
//   import { posts } from './core.js';
//
//   export const events = mysqlTable('events', { ... });
//
// Two things this file cannot do, because Drizzle has no table-extension
// mechanism and permits only one relations() call per table:
//   - add a column to a core table
//   - add to a core table's relations()
// For the first, use a side table here (post_events with postId + eventId).
// If the column belongs on every site, add it upstream in dashboard instead.

export {};
```

Create `src/db/schema.js`:

```js
// src/db/schema.js
// Barrel. Kept at this path so every existing import and drizzle.config.js
// continue to work unchanged. Core tables live in ./schema/core.js; a fork's
// tables live in ./schema/project.js.

export * from './schema/core.js';
export * from './schema/project.js';
```

- [ ] **Step 4: Run the full suite**

Run: `npm run check`
Expected: PASS. `src/db/index.js` re-exports the barrel, so every consumer that
imports tables from `db/index.js` resolves identically.

- [ ] **Step 5: Verify Drizzle still sees the same schema**

Run: `npx drizzle-kit generate --name barrel_check`
Expected: drizzle-kit reports no schema changes and writes no migration file.
If it writes one, the move was not verbatim — delete the generated file, revert,
and redo Step 3.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.js src/db/schema/ tests/unit/schemas/schema-barrel.test.js
git commit -m "refactor(fork): split db schema into core and project modules"
```

---

### Task 4: Sidebar nav injection point

The sidebar is hardcoded HTML across three `sidebar__group` blocks, not a data
structure. Rather than restructure it into a nav config, add one interpolation
slot that renders an extra group when a fork supplies items — and nothing at all
when it does not.

**Files:**
- Create: `src/admin/nav.project.js`
- Modify: `src/admin/templates/partials/sidebar.js` (imports, plus one slot before `</nav>` at line ~177)
- Test: `tests/unit/admin/nav-project.test.js`

**Interfaces:**
- Consumes: `escapeHtml` from `src/admin/templates/utils/helpers.js` (already imported by sidebar.js).
- Produces:
  - `projectNavItems: Array<{ href: string, label: string, icon: string }>` from `src/admin/nav.project.js` — `[]` upstream.
  - `projectNavTitle: string` from the same file — the group heading.
  - `renderProjectNav({ items, title, isActive }): string` from `sidebar.js`, exported for testing.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin/nav-project.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { renderProjectNav, sidebar } from '../../../src/admin/templates/partials/sidebar.js';
import { projectNavItems } from '../../../src/admin/nav.project.js';

const isActive = (route) => (route === '/admin/events' ? 'sidebar__item--active' : '');

describe('renderProjectNav', () => {
  it('renders nothing when a fork supplies no items', () => {
    expect(renderProjectNav({ items: [], title: 'Project', isActive })).toBe('');
  });

  it('renders a group with one entry per item', () => {
    const html = renderProjectNav({
      items: [
        { href: '/admin/events', label: 'Events', icon: 'calendar' },
        { href: '/admin/departments', label: 'Departments', icon: 'building' },
      ],
      title: 'Organisation',
      isActive,
    });

    expect(html).toContain('Organisation');
    expect(html).toContain('href="/admin/events"');
    expect(html).toContain('data-lucide="calendar"');
    expect(html).toContain('href="/admin/departments"');
    expect(html).toContain('data-lucide="building"');
  });

  it('marks the active item', () => {
    const html = renderProjectNav({
      items: [{ href: '/admin/events', label: 'Events', icon: 'calendar' }],
      title: 'Organisation',
      isActive,
    });
    expect(html).toContain('sidebar__item--active');
  });

  it('escapes item text', () => {
    const html = renderProjectNav({
      items: [{ href: '/admin/x', label: '<script>alert(1)</script>', icon: 'box' }],
      title: 'Project',
      isActive,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('nav.project.js', () => {
  it('is empty in dashboard', () => {
    expect(projectNavItems).toEqual([]);
  });
});

describe('sidebar', () => {
  it('renders no project group when there are no project items', () => {
    const html = sidebar({ activeRoute: '/admin', user: { role: 'ADMIN' } });
    expect(html).toContain('/admin/posts');
    expect(html).not.toContain('sidebar__group--project');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/admin/nav-project.test.js`
Expected: FAIL — `renderProjectNav is not a function`

- [ ] **Step 3: Write the implementation**

Create `src/admin/nav.project.js`:

```js
// src/admin/nav.project.js
// Fork-owned. Dashboard ships this empty.
//
// Sidebar entries for fork-only admin sections. `icon` is a Lucide icon name:
//
//   export const projectNavItems = [
//     { href: '/admin/events', label: 'Events', icon: 'calendar' },
//   ];

export const projectNavItems = [];
export const projectNavTitle = 'Project';
```

In `src/admin/templates/partials/sidebar.js`, add below the existing
`escapeHtml` import:

```js
import { projectNavItems, projectNavTitle } from '../../nav.project.js';
```

Add this exported function above `export function sidebar(...)`:

```js
/**
 * Renders the fork-owned sidebar group.
 * Returns an empty string when a fork supplies no items, so dashboard's
 * sidebar is byte-identical to what it rendered before this seam existed.
 *
 * @param {Object} options
 * @param {Array<{href: string, label: string, icon: string}>} options.items
 * @param {string} options.title - Group heading
 * @param {(route: string) => string} options.isActive
 * @returns {string} Sidebar group HTML, or ''
 */
export function renderProjectNav({ items = [], title = 'Project', isActive }) {
  if (items.length === 0) return '';

  const entries = items
    .map(
      (item) => `
            <li>
              <a href="${escapeHtml(item.href)}" class="sidebar__item ${isActive(item.href)}">
                <span class="sidebar__item-icon">
                  <i data-lucide="${escapeHtml(item.icon)}"></i>
                </span>
                <span class="sidebar__item-text">${escapeHtml(item.label)}</span>
              </a>
            </li>`,
    )
    .join('');

  return `
        <!-- Project Group -->
        <div class="sidebar__group sidebar__group--project">
          <div class="sidebar__group-title">${escapeHtml(title)}</div>
          <ul class="sidebar__menu">${entries}
          </ul>
        </div>`;
}
```

Then in the template literal returned by `sidebar(...)`, insert the slot
immediately before the closing `</nav>` — after the Management group's closing
`</div>`:

```js
        ${renderProjectNav({ items: projectNavItems, title: projectNavTitle, isActive })}
      </nav>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/admin/nav-project.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/nav.project.js src/admin/templates/partials/sidebar.js tests/unit/admin/nav-project.test.js
git commit -m "feat(fork): add project nav injection point to sidebar"
```

---

### Task 5: Migration namespacing

A fork's migrations get their own folder, their own Drizzle journal, and their
own tracking table, so the two sequences can never renumber each other.

This task also clears the existing casualty of that collision:
`src/db/migrations/0003_add_setup_tokens.sql` sits on disk but is absent from
`meta/_journal.json` — it was orphaned when it collided with
`0003_add_custom_tables.sql`. Because the journal never listed it, Drizzle has
never applied it, and deleting it changes nothing about how migrations run.

**Files:**
- Modify: `scripts/migrate.js`
- Create: `drizzle.project.config.js`
- Create: `src/db/migrations/project/.gitkeep`
- Delete: `src/db/migrations/0003_add_setup_tokens.sql`
- Test: `tests/unit/schemas/migration-folders.test.js`

**Interfaces:**
- Consumes: `src/db/schema/project.js` from Task 3.
- Produces: `scripts/migrate.js` runs core migrations, then project migrations
  when `src/db/migrations/project/` contains a journal. Project migrations
  track in `__drizzle_migrations_project`.

- [ ] **Step 1: Confirm the orphan is genuinely unapplied**

Run: `grep -c "0003_add_setup_tokens" src/db/migrations/meta/_journal.json`
Expected: `0`. If it prints anything else, STOP — the file is tracked after all;
skip the deletion and note it, but continue with the rest of the task.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/schemas/migration-folders.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(process.cwd(), 'src/db/migrations');

describe('migration folders', () => {
  it('ships a project migration folder as an extension point', () => {
    expect(existsSync(join(MIGRATIONS, 'project'))).toBe(true);
  });

  it('has no core migration numbered twice', () => {
    const numbers = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.slice(0, 4));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('lists every core migration file in the journal', () => {
    const journal = JSON.parse(
      readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8'),
    );
    const tagged = new Set(journal.entries.map((entry) => entry.tag));
    const onDisk = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.replace(/\.sql$/, ''));

    for (const tag of onDisk) {
      expect(tagged.has(tag), `${tag}.sql is not in the journal`).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/schemas/migration-folders.test.js`
Expected: FAIL on two counts — the `project` folder does not exist, and
`0003_add_setup_tokens` is on disk but not in the journal.

- [ ] **Step 4: Create the folder and remove the orphan**

```bash
mkdir -p src/db/migrations/project
touch src/db/migrations/project/.gitkeep
git rm src/db/migrations/0003_add_setup_tokens.sql
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/schemas/migration-folders.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 6: Teach migrate.js about the project folder**

In `scripts/migrate.js`, add to the imports:

```js
import { existsSync } from 'node:fs';
```

Replace the single `await migrate(...)` call inside `runMigrations` with:

```js
    // Core migrations, owned by dashboard.
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    // Fork migrations, owned by the project. Separate folder, separate
    // journal, separate tracking table — the two sequences cannot collide
    // or renumber each other across an upstream merge.
    const projectFolder = './src/db/migrations/project';
    if (existsSync(`${projectFolder}/meta/_journal.json`)) {
      console.log('🔄 Running project migrations...');
      await migrate(db, {
        migrationsFolder: projectFolder,
        migrationsTable: '__drizzle_migrations_project',
      });
    }
```

- [ ] **Step 7: Add the fork's drizzle config**

Create `drizzle.project.config.js`:

```js
// drizzle.project.config.js
// Generates migrations for fork-owned tables only.
//   npx drizzle-kit generate --config drizzle.project.config.js
//
// Dashboard's src/db/schema/project.js is empty, so this generates nothing
// here. It ships anyway so a fork has it ready.

import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

config({ path: resolve(process.cwd(), envFile) });

const parsedDatabaseUrl = new URL(process.env.DATABASE_URL || 'mysql://blogcms_app:password@127.0.0.1:3306/blogcms_app');

export default defineConfig({
  schema: './src/db/schema/project.js',
  out: './src/db/migrations/project',
  dialect: 'mysql',
  driver: 'mysql2',
  dbCredentials: {
    host: parsedDatabaseUrl.hostname,
    port: parsedDatabaseUrl.port ? parseInt(parsedDatabaseUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedDatabaseUrl.username),
    password: decodeURIComponent(parsedDatabaseUrl.password),
    database: parsedDatabaseUrl.pathname.replace(/^\//, ''),
    ssl: parsedDatabaseUrl.searchParams.get('ssl') === 'true',
  },
});
```

Add the companion script to `package.json`, directly after the `"db:generate"`
line:

```json
    "db:generate:project": "drizzle-kit generate --config drizzle.project.config.js",
```

- [ ] **Step 8: Verify migrations still run**

Run: `npm run db:migrate`
Expected: `✅ Migrations completed successfully!` with no project-migration
line, since dashboard's project folder has no journal.

- [ ] **Step 9: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add scripts/migrate.js drizzle.project.config.js package.json src/db/migrations tests/unit/schemas/migration-folders.test.js
git commit -m "feat(fork): namespace project migrations, drop orphaned 0003 migration"
```

---

### Task 6: Fork bootstrap documentation

The seams are useless without the ritual that uses them. This task ships the
`.gitattributes` template and the fork workflow.

**Files:**
- Create: `.gitattributes.fork`
- Create: `docs/forking.md`
- Modify: `docs/README.md` (add a link)

**Interfaces:**
- Consumes: every extension point from Tasks 1-5.
- Produces: documentation only. No code.

- [ ] **Step 1: Create the gitattributes template**

Create `.gitattributes.fork`:

```
# Rename to .gitattributes in a fork, then run once:
#   git config merge.ours.driver true
#
# These paths are fork-owned. Marking them merge=ours means a
# `git merge upstream/<tag>` keeps the fork's version even when dashboard
# changed the same path.

src/app/**                  merge=ours
scss/app/**                 merge=ours
src/db/schema/project.js    merge=ours
src/admin/nav.project.js    merge=ours
src/admin/routes/project/** merge=ours
src/db/migrations/project/** merge=ours
package.json                merge=ours
```

- [ ] **Step 2: Write the fork guide**

Create `docs/forking.md`:

````markdown
# Forking dashboard

Dashboard is the base for other sites. A fork is a full copy: same stack,
`/admin` and `/` both served from the fork. The fork grows its own features
and periodically pulls dashboard's improvements down.

## The rule

Every file has exactly one owner. No file is edited by both dashboard and a
fork.

Core fixes are made in dashboard and pulled down — not fixed in the fork. A
fork that hotfixes a core file has created a divergence, and must either
cherry-pick it upstream or revert it before the next pull.

## Ownership

**Core — dashboard owns; a fork never edits:**

```
src/admin/**  except routes/project/ and nav.project.js
src/lib/ src/services/ src/utils/ src/middleware/ src/plugins/
src/db/schema/core.js
src/db/migrations/*.sql
scss/admin/**  css/index.css
scripts/  src/server.js  src/app.js
```

**Project — the fork owns; dashboard ships these empty:**

```
src/app/**                       the whole client-facing side
scss/app/**  css/app.css
src/db/schema/project.js
src/db/migrations/project/
src/admin/routes/project/
src/admin/nav.project.js
package.json name, .env files
```

## Creating a fork

```bash
git clone git@github.com:joelebukatobi/dashboard-v2.git <project>
cd <project>
git remote rename origin upstream
git remote add origin git@github.com:joelebukatobi/<project>.git
mv .gitattributes.fork .gitattributes
git config merge.ours.driver true
git add .gitattributes && git commit -m "chore: fork-owned merge paths"
git push -u origin main
```

## Adding a feature to a fork

**A table:** define it in `src/db/schema/project.js`. Import from `./core.js`
to point foreign keys at core tables — that is reading, not editing.

Two things that file cannot do, because Drizzle has no table-extension
mechanism and permits only one `relations()` per table: add a column to a
core table, or add to a core table's `relations()`. For the first, use a side
table (`post_events` with `postId` and `eventId`). If the column belongs on
every site, add it upstream in dashboard instead.

**A migration:** `npm run db:generate:project`. It writes to
`src/db/migrations/project/` with its own journal, tracked in
`__drizzle_migrations_project`. `npm run db:migrate` runs core first, then
project.

**An admin screen:** drop `events.routes.js` into `src/admin/routes/project/`.
It autoloads at `/admin/events`. For a prefix that breaks that convention, add
an entry to `src/admin/routes/project/prefixes.js`.

**A sidebar link:** add to `projectNavItems` in `src/admin/nav.project.js`.

**The client-facing site:** `src/app/**` is entirely yours. Replace dashboard's
dummy `home` and `blog` pages outright.

## Pulling dashboard changes down

Dashboard tags releases. Pull to a tag, not to a moving branch.

```bash
git fetch upstream --tags
git checkout -b sync/v1.2.0
git merge v1.2.0
npm install
npm run db:migrate
npm run check
```

A conflict in a core file means the rule was broken — the fork edited
something dashboard owns. Resolve by taking dashboard's version and moving the
fork's change into a project-owned file.

## Sending a fix back up

Rare, and unsupported by tooling on purpose:

```bash
cd ../dashboard
git cherry-pick <sha-from-fork>
```

Only works cleanly for commits that touch core files exclusively.
````

- [ ] **Step 3: Link it from the docs index**

Add to `docs/README.md`, in whatever list of documents it already contains:

```markdown
- [Forking](forking.md) — creating a fork, ownership rules, pulling updates down
```

- [ ] **Step 4: Commit**

```bash
git add .gitattributes.fork docs/forking.md docs/README.md
git commit -m "docs: add fork bootstrap guide and merge-ownership template"
```

---

### Task 7: Tag the first release

A fork pulls to tags, not to `dev`. This task establishes the first one so the
workflow in `docs/forking.md` is usable immediately.

**Files:** none. Git operations only.

**Interfaces:**
- Consumes: Tasks 1-6, all merged.
- Produces: tag `v1.0.0` on the commit where the seams are complete.

- [ ] **Step 1: Verify the tree is clean and green**

Run: `git status --porcelain && npm run check`
Expected: no output from `git status`, and `check` passes.

- [ ] **Step 2: Tag and push**

```bash
git tag -a v1.0.0 -m "First forkable release: route autoload, schema split, nav slot, migration namespacing"
git push origin dev --tags
```

- [ ] **Step 3: Confirm**

Run: `git tag -l && git ls-remote --tags origin`
Expected: `v1.0.0` present locally and on the remote.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Seam 1 — route autoload | 1, 2 |
| Seam 2 — schema split + barrel | 3 |
| Seam 3 — nav injection point | 4 |
| Seam 4 — migration namespacing | 5 |
| Orphaned `0003_add_setup_tokens.sql` | 5 |
| Ownership map | 6 (documented), enforced by 1-5 |
| Git workflow, `.gitattributes`, release tags | 6, 7 |
| Testing — route path assertions | 1 (unit), 2 (smoke) |
| Testing — migration folder independence | 5 |

No spec requirement is without a task.

**Type consistency:** `buildPageManifest`, `buildApiManifest`, and
`buildProjectManifest` all return `{name, file, url, prefix}` and are consumed
with those field names in Task 2. `projectNavItems` is `{href, label, icon}` in
Task 4's implementation, test, and docs. `projectPagePrefixes` /
`projectApiPrefixes` are named identically in Tasks 1, 2, and 6.

**Known gaps, accepted:**

- Task 2's smoke assertions need a live database, since `site-settings` loads
  the settings map in an `onReady` hook. The DB-free safety net is Task 1's
  manifest test, which pins every prefix independently of Fastify.
- Nothing mechanically stops a fork from editing a core file. `.gitattributes`
  protects fork-owned paths from dashboard, not the reverse. A merge conflict
  in a core file is the signal that the rule was broken.
