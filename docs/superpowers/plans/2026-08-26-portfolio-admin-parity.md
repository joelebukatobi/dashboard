# Portfolio Admin Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every admin-side gap between dashboard and `~/Projects/portfolio`, so dashboard carries the current implementation rather than a partial port of it.

**Architecture:** Nine independent tasks, each a small change to one or two files plus a test. Portfolio is the reference for behaviour, not for branding — brand values, its `projects` feature, and public-site routing stay out. Two items deliberately diverge from portfolio and are marked where they occur.

**Tech Stack:** Node 24 ESM, Fastify 4, Drizzle ORM (mysql2), Vitest, SCSS with Tailwind `@apply`.

**Spec:** `docs/superpowers/specs/2026-08-26-portfolio-admin-parity-design.md`

## Global Constraints

- ESM only; every relative import needs its `.js` extension.
- No new runtime dependencies.
- Reference implementation lives at `~/Projects/portfolio` — read it, don't guess.
- Never copy portfolio's brand values: colours `#252422` / `#d45524`, its `Projects` nav item, its `projects` feature, its `/coming-soon` and `/sitemap.xml` routing.
- Tests in `tests/unit/` must not touch the database. Database-backed tests go in `tests/smoke/`.
- `npm run check` must pass at the end of every task.
- Work happens on `dev`. Never commit on `staging` or `main`.

---

## File Structure

**Created:**
- `src/lib/app-secrets.js` — single source for the signing/encryption secret.
- `tests/unit/lib/app-secrets.test.js`
- `tests/unit/services/posts-normalization.test.js`
- `tests/unit/middleware/setup-check.test.js`

**Modified:**
- `src/app.js:77` — JWT secret via `getAppSecret()`; remove `/vendor/*` static routes.
- `src/lib/secret-crypto.js:7` — key via `getAppSecret()`.
- `src/services/posts.service.js` — normalise optional IDs; record daily view.
- `src/middleware/setup-check.js:12-19` — match on pathname.
- `src/lib/media-paths.js` — add `isLocalDevMediaUrl()` and its branch.
- `src/lib/email-templates.js:30-38,188` — acronym-preserving title case.
- `src/services/analytics.service.js` — add `toDateKey()`, `recordDailyView()`; widen chart window.
- `scss/admin/pages/_login.scss`, `components/molecules/_form.scss`, `components/atoms/_input.scss`, `components/organisms/_list-toolbar.scss`, `pages/_settings.scss`
- `tests/unit/lib/media-paths.test.js`, `tests/unit/lib/email-templates.test.js` — extend.
- `docs/forking.md` — record the two behaviour changes forks inherit.

---

### Task 1: Centralise the app secret

Dashboard has two consumers of one secret that disagree. `src/app.js:77` falls
back to `'dev-secret-change-in-production'` — a string committed to a public
repo, so anyone could forge an admin session. `src/lib/secret-crypto.js:7`
throws instead.

**Deliberate divergence from portfolio:** portfolio's `getAppSecret()` always
falls back. Dashboard must **throw in production** when neither variable is
set. Portfolio is one deployment its author controls; dashboard is a base
every fork inherits, and a silent fallback would ship a forgeable secret.

**Files:**
- Create: `src/lib/app-secrets.js`
- Modify: `src/app.js:77`, `src/lib/secret-crypto.js:7`
- Test: `tests/unit/lib/app-secrets.test.js`

**Interfaces:**
- Produces: `getAppSecret(): string` and `FALLBACK_APP_SECRET: string` from `src/lib/app-secrets.js`. Throws `Error` when `NODE_ENV === 'production'` and neither `APP_ENCRYPTION_KEY` nor `JWT_SECRET` is set.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lib/app-secrets.test.js`:

```js
import { describe, it, expect, afterEach } from 'vitest';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

// Fresh import each time so module-level state cannot leak between cases.
async function loadModule() {
  const mod = await import(`../../../src/lib/app-secrets.js?t=${Date.now()}`);
  return mod;
}

describe('getAppSecret', () => {
  it('prefers APP_ENCRYPTION_KEY over JWT_SECRET', async () => {
    process.env.APP_ENCRYPTION_KEY = 'encryption-key';
    process.env.JWT_SECRET = 'jwt-secret';
    const { getAppSecret } = await loadModule();
    expect(getAppSecret()).toBe('encryption-key');
  });

  it('falls back to JWT_SECRET when APP_ENCRYPTION_KEY is unset', async () => {
    delete process.env.APP_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'jwt-secret';
    const { getAppSecret } = await loadModule();
    expect(getAppSecret()).toBe('jwt-secret');
  });

  it('trims surrounding whitespace from a pasted value', async () => {
    process.env.APP_ENCRYPTION_KEY = '  spaced-secret  ';
    const { getAppSecret } = await loadModule();
    expect(getAppSecret()).toBe('spaced-secret');
  });

  it('returns the development fallback when neither is set outside production', async () => {
    delete process.env.APP_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const { getAppSecret, FALLBACK_APP_SECRET } = await loadModule();
    expect(getAppSecret()).toBe(FALLBACK_APP_SECRET);
  });

  it('throws in production when neither is set', async () => {
    delete process.env.APP_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    const { getAppSecret } = await loadModule();
    expect(() => getAppSecret()).toThrow(/APP_ENCRYPTION_KEY or JWT_SECRET/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/app-secrets.test.js`
Expected: FAIL — `Failed to load url ../../../src/lib/app-secrets.js`

- [ ] **Step 3: Write the implementation**

Create `src/lib/app-secrets.js`:

```js
// src/lib/app-secrets.js
// Single source for the secret used to sign JWTs and encrypt stored settings.
// Both must agree: a token signed with one value cannot be verified with
// another, and settings encrypted under one key cannot be decrypted under a
// different one.

export const FALLBACK_APP_SECRET = 'dev-secret-change-in-production';

/**
 * @returns {string} The application secret.
 * @throws {Error} In production when no secret is configured.
 */
export function getAppSecret() {
  const configured = process.env.APP_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!configured) {
    // Dashboard is a base template. A fork that forgets this variable would
    // otherwise sign sessions with a value published in this repository, so
    // production refuses to start rather than doing that silently.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'APP_ENCRYPTION_KEY or JWT_SECRET is required in production. ' +
          'Set one in your hosting environment before deploying.',
      );
    }
    return FALLBACK_APP_SECRET;
  }

  return String(configured).trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/lib/app-secrets.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Route both consumers through it**

In `src/app.js`, add to the imports near the other `./lib/` imports:

```js
import { getAppSecret } from './lib/app-secrets.js';
```

Replace line 77:

```js
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
```

with:

```js
    secret: getAppSecret(),
```

In `src/lib/secret-crypto.js`, add at the top:

```js
import { getAppSecret } from './app-secrets.js';
```

and replace the body of `getEncryptionKey()` lines 7-11:

```js
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY or JWT_SECRET is required to encrypt secrets');
  }
```

with:

```js
  const secret = getAppSecret();
```

- [ ] **Step 6: Run the full suite**

Run: `npm run check`
Expected: PASS. `tests/unit/lib/secret-crypto.test.js` must still pass — it
exercises encrypt/decrypt round-tripping and will fail if the key derivation
changed shape.

- [ ] **Step 7: Commit**

```bash
git add src/lib/app-secrets.js src/app.js src/lib/secret-crypto.js tests/unit/lib/app-secrets.test.js
git commit -m "fix(security): centralise the app secret, refuse the fallback in production"
```

---

### Task 2: Normalise optional post IDs

An empty `<select>` submits `''`. Against a foreign key that is not `NULL`, so
saving a post with no category or no featured image is expected to fail.
Dashboard already ships the helper at `src/lib/post-input.js:7`, unused.

**Files:**
- Modify: `src/services/posts.service.js` (imports, line 251, line 256, line 329, line 333)
- Test: `tests/unit/services/posts-normalization.test.js`

**Interfaces:**
- Consumes: `normalizeOptionalId(value): string|null` from `src/lib/post-input.js`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

This test covers the helper's contract and the exact expressions the service
uses, without touching the database — `tests/unit/` must stay DB-free.

Create `tests/unit/services/posts-normalization.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeOptionalId } from '../../../src/lib/post-input.js';

describe('normalizeOptionalId', () => {
  it('turns an empty string into null', () => {
    expect(normalizeOptionalId('')).toBeNull();
  });

  it('turns a whitespace-only string into null', () => {
    expect(normalizeOptionalId('   ')).toBeNull();
  });

  it('turns undefined and null into null', () => {
    expect(normalizeOptionalId(undefined)).toBeNull();
    expect(normalizeOptionalId(null)).toBeNull();
  });

  it('preserves a real id, trimmed', () => {
    expect(normalizeOptionalId('  abc-123  ')).toBe('abc-123');
  });
});

// The update path must distinguish "field absent" (keep existing) from
// "field cleared" (set null). Getting this backwards silently prevents users
// from ever removing a category once set.
describe('update-path expression', () => {
  const applied = (incoming, existing) =>
    incoming !== undefined ? normalizeOptionalId(incoming) : existing;

  it('keeps the existing value when the field is absent', () => {
    expect(applied(undefined, 'existing-id')).toBe('existing-id');
  });

  it('clears the value when the field is submitted empty', () => {
    expect(applied('', 'existing-id')).toBeNull();
  });

  it('replaces the value when a new id is submitted', () => {
    expect(applied('new-id', 'existing-id')).toBe('new-id');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/posts-normalization.test.js`
Expected: PASS, 7 tests. This is deliberate — it characterises the helper and
the intended expression before the service is changed. The service change is
verified in Step 5.

- [ ] **Step 3: Import the helper**

In `src/services/posts.service.js`, add below the existing
`mediaItemPublicUrl` import:

```js
import { normalizeOptionalId } from '../lib/post-input.js';
```

- [ ] **Step 4: Apply it on both paths**

On the create path, line 251 `categoryId,` becomes:

```js
        categoryId: normalizeOptionalId(categoryId),
```

and line 256 `featuredImageId,` becomes:

```js
        featuredImageId: normalizeOptionalId(featuredImageId),
```

On the update path, line 329:

```js
        categoryId: categoryId || post.categoryId,
```

becomes:

```js
        categoryId: categoryId !== undefined ? normalizeOptionalId(categoryId) : post.categoryId,
```

Note this also fixes a second bug on that line: `categoryId || post.categoryId`
treats an empty string as falsy and silently keeps the old category, so
clearing a category was impossible.

Line 333:

```js
        featuredImageId: featuredImageId !== undefined ? featuredImageId : post.featuredImageId,
```

becomes:

```js
        featuredImageId: featuredImageId !== undefined ? normalizeOptionalId(featuredImageId) : post.featuredImageId,
```

- [ ] **Step 5: Verify against a real database**

Run: `npm run check`
Expected: PASS.

Then confirm the actual insert works with an empty category. Run:

```bash
node --input-type=module -e "
import { postsService } from './src/services/posts.service.js';
import { db, posts, users } from './src/db/index.js';
import { eq } from 'drizzle-orm';
const [admin] = await db.select().from(users).limit(1);
const id = await postsService.createPost({
  title: 'Parity check post', slug: 'parity-check-post-' + Date.now(),
  content: 'body', excerpt: '', categoryId: '', featuredImageId: '',
  status: 'DRAFT', tagIds: [],
}, admin.id);
const [row] = await db.select().from(posts).where(eq(posts.id, id));
console.log('categoryId:', row.categoryId, '| featuredImageId:', row.featuredImageId);
await db.delete(posts).where(eq(posts.id, id));
process.exit(0);"
```

Expected: `categoryId: null | featuredImageId: null`. Before this change the
insert fails with a foreign key error. If `createPost` returns something other
than the id, adjust the destructuring — read the function signature first.

- [ ] **Step 6: Commit**

```bash
git add src/services/posts.service.js tests/unit/services/posts-normalization.test.js
git commit -m "fix(posts): normalise empty category and featured image ids to null"
```

---

### Task 3: Match the setup check against the pathname

`src/middleware/setup-check.js` compares `request.url`, which includes the
query string. The exact comparisons at lines 18-19 therefore miss whenever a
query is appended — and this app appends one to every asset (`?v=...`).

Portfolio's other changes in this file — the `/coming-soon` redirect and the
`/sitemap.xml` skip — are public-site behaviour and are **out of scope**.

**Files:**
- Modify: `src/middleware/setup-check.js:12-19`, and the `/setup` check on line 24
- Test: `tests/unit/middleware/setup-check.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports; behaviour change only.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/middleware/setup-check.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The middleware needs a database and a Fastify request to run, so this
// asserts the shape of the fix rather than executing it: matching must be
// done against a query-stripped pathname, not the raw url.
const source = readFileSync('src/middleware/setup-check.js', 'utf8');

describe('setup check path matching', () => {
  it('strips the query string before matching', () => {
    expect(source).toMatch(/const pathname = request\.url\.split\('\?'\)\[0\]/);
  });

  it('matches on pathname rather than the raw url', () => {
    const rawUrlMatches = source.match(/request\.url\.startsWith|request\.url ===/g) || [];
    expect(
      rawUrlMatches,
      'every skip check should compare pathname, not request.url',
    ).toEqual([]);
  });
});

describe('pathname derivation', () => {
  const pathnameOf = (url) => url.split('?')[0];

  it('drops an asset version query', () => {
    expect(pathnameOf('/favicon.ico?v=abc123')).toBe('/favicon.ico');
  });

  it('leaves a plain path untouched', () => {
    expect(pathnameOf('/admin/auth/login')).toBe('/admin/auth/login');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/middleware/setup-check.test.js`
Expected: FAIL on both `setup check path matching` cases — the constant does
not exist and raw `request.url` comparisons are present.

- [ ] **Step 3: Write the implementation**

In `src/middleware/setup-check.js`, immediately before the skip block at line
12, add:

```js
    const pathname = request.url.split('?')[0];
```

Then replace lines 12-19 with:

```js
    if (pathname.startsWith('/dist/') ||
        pathname.startsWith('/vendor/') ||
        pathname.startsWith('/public/') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/health') ||
        pathname.startsWith('/admin/auth/') ||
        pathname === '/favicon.ico' ||
        pathname === '/favicon.svg') {
```

and line 24:

```js
    if (request.url.startsWith('/setup')) {
```

with:

```js
    if (pathname.startsWith('/setup')) {
```

Line 37 (`request.url === '/' || request.url === ''`) is inside the
public-site branch this task does not touch — but it has the same defect, so
change it too for consistency:

```js
        if (pathname === '/' || pathname === '') {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/middleware/setup-check.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/middleware/setup-check.js tests/unit/middleware/setup-check.test.js
git commit -m "fix(setup): match the setup check against the pathname, not the raw url"
```

---

### Task 4: Rewrite localhost media URLs

The admin editor saves absolute `http://localhost:7000/...` URLs when content
is authored locally. Deployed, those are dead. Portfolio rewrites them to
public paths.

**Files:**
- Modify: `src/lib/media-paths.js`
- Test: `tests/unit/lib/media-paths.test.js` (extend)

**Interfaces:**
- Produces: `isLocalDevMediaUrl(value): boolean` from `src/lib/media-paths.js`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/lib/media-paths.test.js`, and add
`isLocalDevMediaUrl` to the existing import at the top of that file:

```js
describe('isLocalDevMediaUrl', () => {
  it('recognises localhost with a port', () => {
    expect(isLocalDevMediaUrl('http://localhost:7000/public/uploads/a.jpg')).toBe(true);
  });

  it('recognises loopback addresses', () => {
    expect(isLocalDevMediaUrl('http://127.0.0.1/public/uploads/a.jpg')).toBe(true);
    expect(isLocalDevMediaUrl('https://0.0.0.0:3000/public/uploads/a.jpg')).toBe(true);
  });

  it('rejects a genuine external url', () => {
    expect(isLocalDevMediaUrl('https://images.unsplash.com/photo-1.jpg')).toBe(false);
  });

  it('rejects a hostname that merely starts with localhost', () => {
    expect(isLocalDevMediaUrl('https://localhost.example.com/a.jpg')).toBe(false);
  });

  it('rejects empty and non-string input', () => {
    expect(isLocalDevMediaUrl('')).toBe(false);
    expect(isLocalDevMediaUrl(null)).toBe(false);
    expect(isLocalDevMediaUrl(42)).toBe(false);
  });
});

describe('toPublicMediaUrl with localhost urls', () => {
  it('rewrites a localhost url to its public path', () => {
    expect(toPublicMediaUrl('http://localhost:7000/public/uploads/posts/p.jpg'))
      .toBe('/public/uploads/posts/p.jpg');
  });

  it('still passes a genuine external url through unchanged', () => {
    expect(toPublicMediaUrl('https://images.unsplash.com/photo-1.jpg'))
      .toBe('https://images.unsplash.com/photo-1.jpg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/media-paths.test.js`
Expected: FAIL — `isLocalDevMediaUrl is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/lib/media-paths.js`, add above `toPublicMediaUrl`:

```js
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
```

Then inside `toPublicMediaUrl`, immediately after the empty-value guard
(`if (!value) return '';` at line 16) and **before** the
`if (/^https?:\/\//i.test(value))` passthrough at line 18, insert:

```js
  if (isLocalDevMediaUrl(value)) {
    try {
      return toPublicMediaUrl(new URL(value).pathname);
    } catch {
      return '';
    }
  }
```

Order matters: the existing passthrough returns any `http(s)` URL unchanged,
so placing this after it would make it unreachable.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/media-paths.test.js`
Expected: PASS, all cases including the pre-existing ones.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/lib/media-paths.js tests/unit/lib/media-paths.test.js
git commit -m "fix(media): rewrite localhost editor urls to public paths"
```

---

### Task 5: Preserve acronyms in email title case

`toTitleCase()` lowercases every word before capitalising, so `SMTP` renders
as `Smtp`. The stored headline is already lowercase at line 188.

Portfolio's brand colours are **not** part of this task. Dashboard keeps
`#181818` and `#ea580c`.

**Files:**
- Modify: `src/lib/email-templates.js:30-38`, `src/lib/email-templates.js:188`
- Test: `tests/unit/lib/email-templates.test.js` (extend)

**Interfaces:**
- Produces: no new exports; `toTitleCase` stays module-private.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/lib/email-templates.test.js`. Check the file's existing
imports first — use whichever builder it already exercises; the assertion
below only needs rendered output containing the headline.

```js
import { renderTestEmail } from '../../../src/lib/email-templates.js';

describe('title casing', () => {
  it('preserves acronyms rather than lowercasing them', () => {
    const rendered = renderTestEmail(
      { siteName: 'Test Site' },
      { actionUrl: 'https://example.com' },
    );
    const html = typeof rendered === 'string' ? rendered : rendered.html;

    expect(html).toContain('SMTP test successful');
    expect(html).not.toContain('Smtp');
  });
});
```

`renderTestEmail(settingsMap, { actionUrl })` is the exported builder that
renders the headline at line 188 — add it to the file's existing import if it
is not already there.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/email-templates.test.js`
Expected: FAIL — the rendered output contains `Smtp Test Successful`.

- [ ] **Step 3: Write the implementation**

Replace `toTitleCase` at lines 30-38:

```js
function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

with:

```js
function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      // An all-caps word of more than one character is an acronym — SMTP,
      // API, URL — and lowercasing it first would destroy it.
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
```

Note the `.toLowerCase()` moves off the whole string and onto the non-acronym
branch, so mixed-case input still normalises.

Then update line 188:

```js
    headline: 'smtp test successful',
```

to:

```js
    headline: 'SMTP test successful',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/email-templates.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/lib/email-templates.js tests/unit/lib/email-templates.test.js
git commit -m "fix(email): preserve acronyms in title-cased headlines"
```

---

### Task 6: Record daily views live

Dashboard stores a cumulative snapshot written by a cron nobody schedules, so
`dailyPageViews` never gains rows in production and the traffic chart stays
empty. Portfolio increments a per-day counter as views happen.

This is a **data model change**, not a drop-in: existing rows hold cumulative
totals and new rows hold daily counts. Task 7 handles the existing rows.

**Files:**
- Modify: `src/services/analytics.service.js` (add `toDateKey`, `recordDailyView`, widen the window in `getTrafficData`)
- Modify: `src/services/posts.service.js` (`incrementViewCount`, around line 686-694)
- Test: `tests/smoke/analytics-recording.test.js`

**Interfaces:**
- Produces: `analyticsService.recordDailyView(): Promise<void>` — inserts a row for today with `totalViews: 1`, or increments the existing row.
- Consumes: `dailyPageViews` from `src/db/index.js`, `sql` from `drizzle-orm` (both already imported in `analytics.service.js`).

- [ ] **Step 1: Write the failing test**

This one needs a database, so it belongs in `tests/smoke/`.

Create `tests/smoke/analytics-recording.test.js`:

```js
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { analyticsService } from '../../src/services/analytics.service.js';
import { db, dailyPageViews } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

describe('recordDailyView', () => {
  beforeEach(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

  afterAll(async () => {
    await db.delete(dailyPageViews).where(eq(dailyPageViews.date, todayKey()));
  });

  it('creates a row for today with a count of one', async () => {
    await analyticsService.recordDailyView();

    const [row] = await db
      .select()
      .from(dailyPageViews)
      .where(eq(dailyPageViews.date, todayKey()));

    expect(row).toBeDefined();
    expect(Number(row.totalViews)).toBe(1);
  });

  it('increments the existing row rather than inserting a duplicate', async () => {
    await analyticsService.recordDailyView();
    await analyticsService.recordDailyView();
    await analyticsService.recordDailyView();

    const rows = await db
      .select()
      .from(dailyPageViews)
      .where(eq(dailyPageViews.date, todayKey()));

    expect(rows).toHaveLength(1);
    expect(Number(rows[0].totalViews)).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/smoke/analytics-recording.test.js`
Expected: FAIL — `analyticsService.recordDailyView is not a function`.

Requires a reachable database. If it errors on connection instead, start your
local MySQL before continuing.

- [ ] **Step 3: Add the recording method**

In `src/services/analytics.service.js`, add above the `class AnalyticsService`
declaration:

```js
/**
 * Midnight-normalised YYYY-MM-DD key for the daily counter.
 * @param {Date} [date]
 * @returns {string}
 */
function toDateKey(date = new Date()) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split('T')[0];
}
```

Then add this method inside the class, directly after `aggregateDailyViews()`:

```js
  /**
   * Increment today's view counter. Called on every post view, so it must be
   * cheap and must never throw into the request path — callers guard it.
   * @returns {Promise<void>}
   */
  async recordDailyView() {
    const todayKey = toDateKey();

    await db
      .insert(dailyPageViews)
      .values({
        date: todayKey,
        totalViews: 1,
        uniqueVisitors: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          totalViews: sql`${dailyPageViews.totalViews} + 1`,
          updatedAt: new Date(),
        },
      });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/smoke/analytics-recording.test.js`
Expected: PASS, 2 tests.

`onDuplicateKeyUpdate` relies on a unique key, and `src/db/schema/core.js:406`
defines `uniqueIndex('daily_page_views_date_idx').on(table.date)` — so the
increment fires rather than inserting a second row. If the second test reports
two rows, that index is missing from the database the test ran against; check
that migrations are current with `npm run db:migrate`.

- [ ] **Step 5: Call it on post view**

In `src/services/posts.service.js`, add to the imports:

```js
import { analyticsService } from './analytics.service.js';
```

Then in `incrementViewCount`, after the `.where(eq(posts.id, id));` call and
before `return true;`:

```js
    // Analytics must never break page rendering, so a failure here is logged
    // and swallowed rather than propagated.
    try {
      await analyticsService.recordDailyView();
    } catch (error) {
      console.error('Failed to record daily page view:', error);
    }
```

- [ ] **Step 6: Widen the chart window**

In `getTrafficData()`, the historical query ends at yesterday, which made
sense when rows were written by a nightly job. With live recording today's row
exists and should be shown. Change:

```js
        lte(dailyPageViews.date, yesterday)
```

to:

```js
        lte(dailyPageViews.date, endDate)
```

`endDate` is already declared at the top of that method. Leave the `yesterday`
constant in place if other code in the method still uses it — check with
`grep -n yesterday src/services/analytics.service.js` and remove it only if
it becomes unused.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/services/analytics.service.js src/services/posts.service.js tests/smoke/analytics-recording.test.js
git commit -m "feat(analytics): record daily views live instead of aggregating a cumulative total"
```

---

### Task 7: Clear the cumulative rows

Existing `dailyPageViews` rows hold cumulative totals. Mixed with the per-day
counts Task 6 now writes, the chart plots a line that is neither.

On dashboard's sandbox those rows are simulation output and can go. A fork
with genuine history must make its own call, so this is documented rather than
automated.

**Files:**
- Modify: `docs/forking.md`
- No code changes.

**Interfaces:**
- Consumes: Task 6's behaviour change.
- Produces: documentation only.

- [ ] **Step 1: Document the change for forks**

Add to `docs/forking.md`, immediately before the `## Sending a fix back up`
section:

```markdown
## Behaviour changes that affect existing installs

**Daily analytics changed meaning.** `daily_page_views.total_views` used to
hold a cumulative snapshot of every post view ever, written by
`scripts/cli.js analytics aggregate`. It now holds a per-day count,
incremented as views happen. Rows written under the old model are not
comparable with new ones, so clear them once when upgrading:

```sql
TRUNCATE TABLE daily_page_views;
```

`aggregateDailyViews()` remains available as a backfill tool, and the
simulation commands (`npm run simulate:day`, `npm run simulate:days`) still
populate a fresh install with plausible data.

**A secret is now required in production.** The app refuses to start when
neither `APP_ENCRYPTION_KEY` nor `JWT_SECRET` is set and `NODE_ENV` is
`production`. Previously it fell back to a value published in this
repository, which meant a fork that forgot the variable shipped a forgeable
session secret. Set one in your hosting environment before deploying.
```

- [ ] **Step 2: Clear the rows on the deployed sandbox**

Run against the deployed database, over SSH or via the hosting panel:

```sql
TRUNCATE TABLE daily_page_views;
```

Expected: the Dashboard traffic chart is empty, then repopulates from real
traffic as views arrive.

- [ ] **Step 3: Commit**

```bash
git add docs/forking.md
git commit -m "docs: record the analytics and secret behaviour changes forks inherit"
```

---

### Task 8: Port the admin styling fixes

Five SCSS files where portfolio is ahead. `scss/admin/pages/_coming-soon.scss`
also differs but is public-facing and **out of scope**.

**Files:**
- Modify: `scss/admin/pages/_login.scss`, `scss/admin/components/molecules/_form.scss`, `scss/admin/components/atoms/_input.scss`, `scss/admin/components/organisms/_list-toolbar.scss`, `scss/admin/pages/_settings.scss`

**Interfaces:**
- Consumes: nothing.
- Produces: no exports; visual changes only.

- [ ] **Step 1: Review each diff before copying**

Run:

```bash
P=~/Projects/portfolio
for f in scss/admin/pages/_login.scss \
         scss/admin/components/molecules/_form.scss \
         scss/admin/components/atoms/_input.scss \
         scss/admin/components/organisms/_list-toolbar.scss \
         scss/admin/pages/_settings.scss; do
  echo "════ $f ════"
  diff "$f" "$P/$f"
done
```

Read each hunk. Copy portfolio's version **only** where the change is
structural or a fix — do not carry across any colour value, image URL, or
copy string that is portfolio branding.

- [ ] **Step 2: Apply the changes**

`scss/admin/pages/_login.scss` — the branding panel becomes a full-bleed
background on mobile and a split panel from `lg` up, rather than being hidden
below `lg`. The container gains `relative`; the panel changes from
`hidden lg:flex lg:w-1/2` plus `relative overflow-hidden z-[60]` to
`absolute inset-0 z-0 bg-cover bg-center overflow-hidden` plus
`lg:static lg:flex lg:w-1/2 lg:z-[60]`. **Keep dashboard's existing
`background-image` URL** — portfolio's is its own artwork.

`scss/admin/components/molecules/_form.scss` — the form group becomes
`relative flex flex-col`, with `.label { @apply order-1; }` and
`> *:not(.label) { @apply order-2; }` so the label always renders above its
control regardless of source order.

`scss/admin/components/atoms/_input.scss` — drop `bg-grey-100` and
`bg-grey-800` from the two affected states, leaving the text colours; add
`stroke-1` to the `w-[2rem] h-[2rem]` icon rule.

`scss/admin/components/organisms/_list-toolbar.scss` — remove the
`.dark & { @apply bg-white text-grey-900 hover:bg-grey-100; }` override block.

`scss/admin/pages/_settings.scss` — change `@apply mb-[2rem];` to
`@apply mb-0;`.

- [ ] **Step 3: Verify the build**

Run: `npm run build:css`
Expected: completes with no error. Sass fails loudly on malformed `@apply`
rules, so a successful build confirms the syntax.

- [ ] **Step 4: Confirm no branding leaked in**

Run:

```bash
grep -rn "252422\|d45524" scss/admin/ || echo "no portfolio brand colours"
```

Expected: `no portfolio brand colours`.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add scss/admin/
git commit -m "style(admin): port login, form, input, toolbar and settings fixes from portfolio"
```

---

### Task 9: Remove the unreferenced vendor routes

Since `2a05674` the templates load frontend libraries from `/dist/js/`. The
three `/vendor/*` static routes still serve those libraries straight out of
`node_modules` and nothing references them.

**Files:**
- Modify: `src/app.js` (three `fastifyStatic` registrations, roughly lines 122-141)
- Test: `tests/smoke/app.test.js` (extend)

**Interfaces:**
- Consumes: nothing.
- Produces: no exports; removes three route prefixes.

- [ ] **Step 1: Confirm nothing references them**

Run:

```bash
grep -rn "/vendor/" src/ scss/ css/ --include="*.js" --include="*.scss" --include="*.css" | grep -v "setup-check"
```

Expected: no output apart from the `setup-check.js` skip-list entry, which is
harmless to leave. If a template still references `/vendor/`, **stop** — that
template needs migrating to `/dist/js/` first, and this task is blocked.

- [ ] **Step 2: Write the failing test**

Append to `tests/smoke/app.test.js`, inside the existing `describe` block:

```js
  it('no longer serves libraries straight from node_modules', () => {
    for (const path of [
      '/vendor/htmx/htmx.min.js',
      '/vendor/preline/preline.js',
      '/vendor/apexcharts/apexcharts.min.js',
    ]) {
      expect(
        [...routeUrls].some((url) => url.startsWith(path.split('/').slice(0, 3).join('/'))),
        `${path} should no longer be registered`,
      ).toBe(false);
    }
  });

  it('still serves the built bundles', () => {
    expect([...routeUrls].some((url) => url.startsWith('/dist/'))).toBe(true);
  });
```

`routeUrls` is the `Set` already populated by the `onRoute` hook in that
file's `beforeAll`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/smoke/app.test.js`
Expected: FAIL on the first case — the vendor routes are still registered.

- [ ] **Step 4: Remove the registrations**

In `src/app.js`, delete these three blocks along with their comments:

```js
  // Serve node_modules/htmx.org for HTMX
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/htmx.org/dist'),
    prefix: '/vendor/htmx/',
    decorateReply: false,
  });

  // Serve node_modules/preline/dist for Preline JS
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/preline/dist'),
    prefix: '/vendor/preline/',
    decorateReply: false,
  });

  // Serve ApexCharts
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/apexcharts/dist'),
    prefix: '/vendor/apexcharts/',
    decorateReply: false,
  });
```

Leave every other `fastifyStatic` registration alone — `/dist/`, `/public/`
and `/uploads/` are all in use.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/smoke/app.test.js`
Expected: PASS. The route-parity assertions already in that file must also
still pass, confirming nothing else moved.

- [ ] **Step 6: Run the full suite and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/app.js tests/smoke/app.test.js
git commit -m "chore(app): drop the unreferenced /vendor static routes"
```

---

### Task 10: Promote and verify on the deployed site

Every preceding task is committed on `dev`. This one gets the work in front of
real hosting and confirms the two user-visible fixes.

**Files:** none. Git and verification only.

**Interfaces:**
- Consumes: Tasks 1-9.

- [ ] **Step 1: Confirm the tree is clean and green**

Run: `git status --porcelain && npm run check`
Expected: no output from `git status`, and the suite passes.

- [ ] **Step 2: Push dev and wait for Checks**

```bash
git push origin dev
gh run watch "$(gh run list --branch dev --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Expected: `Checks` concludes successfully.

- [ ] **Step 3: Confirm the production secret is set before promoting**

Task 1 makes a missing secret fatal in production. Verify `APP_ENCRYPTION_KEY`
or `JWT_SECRET` exists in the cPanel Node app's environment variables **before
deploying**, or the app will refuse to start after the restart.

- [ ] **Step 4: Promote to staging**

```bash
git checkout staging && git merge --ff-only dev && git push origin staging
gh run watch "$(gh run list --branch staging --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
git checkout dev
```

Expected: the `Deploy Staging` run concludes successfully, both the `check`
job and the `deploy` job.

- [ ] **Step 5: Verify the site**

```bash
curl -s https://sandbox.joelebukatobi.dev/health
```

Expected: `"status":"healthy"` and `"environment":"production"`. If the app
fails to boot, check the secret from Step 3 first.

Then in a browser, signed into `/admin`: create a post leaving **Category** and
**Featured image** empty and save it. Expected: it saves rather than erroring.
This is the Task 2 fix and it cannot be verified from the command line.

- [ ] **Step 6: Clear the cumulative analytics rows**

Run against the deployed database (Task 7, Step 2):

```sql
TRUNCATE TABLE daily_page_views;
```

Then view a post on the public site and confirm a row appears for today:

```sql
SELECT date, total_views FROM daily_page_views ORDER BY date DESC LIMIT 3;
```

Expected: one row dated today, `total_views` incrementing as you reload.

---

## Self-Review

**Spec coverage:**

| Spec item | Task |
|---|---|
| A1 — JWT fallback / `app-secrets.js` | 1 |
| A2 — optional post ID normalisation | 2 |
| A3 — setup check pathname | 3 |
| B1 — localhost media URLs | 4 |
| B2 — email acronym casing | 5 |
| C1 — live daily recording | 6 |
| C2 — existing cumulative rows | 7 |
| C3 — keep simulation and aggregate as tooling | 7 (documented; no code change by design) |
| D — admin styling, five files | 8 |
| E — correctly different, do not port | none needed; Task 8 Step 4 guards against brand leakage |
| F — `/vendor/*` cleanup | 9 |
| F — `health-check.js` extraction | skipped per spec |
| F — `loadCpanelEnvVars` | skipped per spec |
| Risk — boot behaviour change documented | 7 |
| Risk — chart discontinuity documented | 7 |

No spec requirement is unaddressed.

**Type consistency:** `getAppSecret()` and `FALLBACK_APP_SECRET` are named
identically in Tasks 1 and 7. `normalizeOptionalId` matches
`src/lib/post-input.js:7` exactly. `recordDailyView()` and `toDateKey()` are
named consistently across Tasks 6 and 7. `isLocalDevMediaUrl` matches Task 4's
implementation and its test.

**Known gaps, accepted:**

- Task 3's test asserts source shape rather than executing the middleware,
  which needs a database and a Fastify request. The behavioural half is
  covered by the pure `pathnameOf` cases.
- Task 2's database verification is a one-off script rather than a committed
  test, because `tests/unit/` must stay database-free and the smoke suite has
  no post-creation fixture.
