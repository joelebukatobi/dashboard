# Portfolio Admin Parity Design

**Date:** 2026-08-26
**Status:** Approved for planning
**Source of truth:** `~/Projects/portfolio` — the most current admin implementation
**Target:** `joelebukatobi/dashboard`

## Problem

Dashboard's admin was ported from portfolio, but the port was partial. Two
defects from that gap have already reached production and both failed
invisibly — the site rendered, the server stayed healthy, and nothing appeared
in any log:

- The deploy built CSS but not JS, so `/dist/js/*` 404'd and every `hx-*`
  attribute was inert. The login form did nothing when submitted.
- The CSP lost `scriptSrcAttr`, so every one of ~94 inline `onclick` handlers
  was silently refused. The logout dropdown did nothing when clicked.

Both are fixed. This spec covers everything else that differs, so the
remaining gaps are closed deliberately rather than discovered one production
incident at a time.

## Scope

**In scope:** the admin surface — `src/admin/**`, `src/services/**`,
`src/lib/**`, `src/middleware/**`, `src/plugins/**`, `scss/admin/**`, and the
admin-relevant parts of `src/app.js`.

**Out of scope:** `src/app/**`, `scss/app/**`, and anything serving `/` or the
public site. Portfolio's public frontend is its own product and must not
travel.

## Decisions taken

**Analytics adopts portfolio's live-recording model.** Dashboard currently
stores a cumulative snapshot; portfolio increments a per-day counter as views
happen. These are different data models, not different implementations of one
model, so this is a migration and not a patch.

**Branding stays dashboard's.** Portfolio's brand colours, its `Projects` nav
item and feature, and its `/coming-soon` public routing are excluded. Only
behavioural fixes travel.

## How the comparison was produced

Reproducible, so it can be re-run when portfolio moves again:

```bash
P=~/Projects/portfolio
# Files unique to each side
for d in src/admin src/services src/lib src/middleware src/plugins; do
  comm -3 <(find $d -name '*.js' | sed "s|^$d/||" | sort) \
          <(cd $P && find $d -name '*.js' | sed "s|^$d/||" | sort)
done
# Shared files ranked by size of difference
for f in $(find src/admin src/services src/lib src/middleware -name '*.js'); do
  [ -f "$P/$f" ] && d=$(diff "$f" "$P/$f" | grep -c '^[<>]') && [ "$d" -gt 0 ] \
    && printf '%5s  %s\n' "$d" "$f"
done | sort -rn
```

## Category A — Defects

### A1. JWT signing falls back to a published secret

`src/app.js:77` reads:

```js
secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
```

If `JWT_SECRET` is unset in production, tokens are signed with a string that
is committed to a public repository. Anyone could forge an admin session.
Meanwhile `src/lib/secret-crypto.js:7` throws in the same situation, so the
two consumers of the same secret disagree about whether its absence is fatal.

Portfolio centralises this in `src/lib/app-secrets.js`:

```js
export const FALLBACK_APP_SECRET = 'dev-secret-change-in-production';

export function getAppSecret() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.JWT_SECRET || FALLBACK_APP_SECRET;
  return String(secret).trim();
}
```

**Replicate, with one deliberate divergence.** Create the module and route
both `src/app.js` and `src/lib/secret-crypto.js` through it — but dashboard
should *refuse to boot in production* when neither variable is set, rather
than falling back. Portfolio's fallback is acceptable for one deployment the
author controls; dashboard is a base template every fork inherits, and a fork
that forgets the variable would ship a forgeable session secret without
warning.

**Verify:** a test asserting `getAppSecret()` throws when `NODE_ENV` is
production and neither variable is set, and returns the fallback otherwise.

### A2. Optional post IDs are not normalised

`src/services/posts.service.js` writes `categoryId` and `featuredImageId`
straight through on create and update. An empty `<select>` submits `''`, which
against a foreign key is not the same as `NULL` — saving a post with no
category or no featured image is expected to fail.

Dashboard already contains the helper, unused, at
`src/lib/post-input.js:7`. Portfolio imports it in `posts.service.js` and
wraps both fields:

```js
categoryId: normalizeOptionalId(categoryId),
featuredImageId: normalizeOptionalId(featuredImageId),
// update path:
categoryId: categoryId !== undefined ? normalizeOptionalId(categoryId) : post.categoryId,
featuredImageId: featuredImageId !== undefined ? normalizeOptionalId(featuredImageId) : post.featuredImageId,
```

**Replicate exactly.** The helper is already identical in both projects.

**Verify:** a test creating a post with `categoryId: ''` and asserting the
stored value is `null`, plus one updating an existing post the same way.

### A3. Setup check matches against the query string

`src/middleware/setup-check.js` compares `request.url`, which includes any
query string. Exact comparisons such as `request.url === '/favicon.ico'`
therefore miss whenever a query is appended. Portfolio strips it first:

```js
const pathname = request.url.split('?')[0];
```

and compares `pathname` throughout.

**Replicate the pathname change only.** Portfolio's other edits in this file —
the `/coming-soon` redirect and the `/sitemap.xml` skip — are public-site
behaviour and are out of scope.

**Verify:** a test asserting a request to `/favicon.ico?v=2` is skipped by the
setup check.

## Category B — Missing behaviour

### B1. Local media URLs are not rewritten

Portfolio adds `isLocalDevMediaUrl()` to `src/lib/media-paths.js` and uses it
so absolute `localhost` URLs saved by the admin editor resolve to public paths
once deployed:

```js
export function isLocalDevMediaUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\//i.test(value.trim());
}
```

with the consuming branch:

```js
if (isLocalDevMediaUrl(value)) {
  try {
    return toPublicMediaUrl(new URL(value).pathname);
  } catch {
    return '';
  }
}
```

Without it, content authored against a local server carries dead image URLs
into production. This is directly relevant to dashboard, whose whole workflow
is author-locally-then-deploy.

**Verify:** a test asserting `http://localhost:7000/public/uploads/x.jpg`
resolves to the public path, and that a genuine external URL is left alone.

### B2. Email template title casing destroys acronyms

Dashboard lowercases every word before capitalising the first letter, turning
`SMTP` into `Smtp`. Portfolio preserves all-caps words:

```js
.map((word) => {
  if (word === word.toUpperCase() && word.length > 1) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
})
```

**Replicate the casing function only.** Portfolio's colour values
(`#252422`, `#d45524`) are its brand and stay out; dashboard keeps `#181818`
and `#ea580c`. Portfolio also removed the logo-and-name header block and
`resolveSiteUrl()`; both are presentation choices, not fixes, and stay as they
are in dashboard.

**Verify:** a test asserting the headline for the SMTP test email renders as
`SMTP test successful`.

## Category C — Demo data versus real data

Dashboard ships the demonstration path where production needs the real one.

| Concern | Dashboard | Portfolio | Real path present in dashboard? |
|---|---|---|---|
| Per-post view counting | `posts.service.js:689` increments `posts.viewCount` | same | Yes, already real |
| Daily chart data | `aggregateDailyViews()` snapshots `SUM(posts.viewCount)` for *yesterday* | `recordDailyView()` increments a per-day counter live | Yes, but nothing schedules it |
| Simulated traffic | `generateMockTrafficData()`, `seedMockTrafficData()`, `npm run simulate:day`, 7-day scripted simulation | removed | Dev tooling; never called at runtime |
| Chart window | ends at `lte(date, yesterday)` | ends at `endDate`, includes today | Consistent with snapshots, but today never shows |

### C1. Adopt live recording

Add to `src/services/analytics.service.js`:

```js
function toDateKey(date = new Date()) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split('T')[0];
}

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

and call it from the post-view path in `src/services/posts.service.js`, guarded
so an analytics failure never breaks page rendering:

```js
try {
  await analyticsService.recordDailyView();
} catch (error) {
  console.error('Failed to record daily page view:', error);
}
```

Then widen the chart window in `getTrafficData()` from `lte(dailyPageViews.date,
yesterday)` to `lte(dailyPageViews.date, endDate)` so today's traffic appears.

### C2. Handle the existing rows

Existing `dailyPageViews` rows hold cumulative totals. Mixed with new per-day
counts they produce a chart that is neither. On dashboard's own sandbox those
rows are simulation output and can be deleted; a fork with real history must
decide for itself.

The implementation plan should treat this as an explicit step: truncate
`daily_page_views` as part of the switchover, and document it in
`docs/forking.md` so a fork inheriting this change knows its historical rows
change meaning.

### C3. Retire or keep the simulation

`generateMockTrafficData()`, `seedMockTrafficData()`, `npm run simulate:day`,
`npm run simulate:days` and `scripts/lib/tasks/analytics.js` become redundant
for production once recording is live, but remain useful for populating a
fresh install with a plausible-looking dashboard.

**Decision:** keep them, and keep `aggregateDailyViews()` as a backfill tool.
They are dev tooling that nothing calls at runtime, and a base template
benefits from being able to show a populated dashboard on day one. What
changes is that they are no longer the only source of chart data.

## Category D — Admin styling

Six files differ, same file set on both sides, all small. Portfolio is ahead
on each.

| File | Change |
|---|---|
| `scss/admin/pages/_login.scss` | Branding panel becomes a full-bleed background on mobile and a split panel from `lg` up, rather than being hidden below `lg` |
| `scss/admin/components/molecules/_form.scss` | Form group becomes `flex flex-col` with explicit ordering, so the label stays above the control regardless of source order |
| `scss/admin/components/atoms/_input.scss` | Drops the grey background on one state; adds `stroke-1` to the icon sizing |
| `scss/admin/components/organisms/_list-toolbar.scss` | Removes a dark-mode override block |
| `scss/admin/pages/_settings.scss` | Margin `mb-[2rem]` becomes `mb-0` |
| `scss/admin/pages/_coming-soon.scss` | Public-facing — **out of scope** |

**Replicate all but `_coming-soon.scss`.** These are visual fixes with no
branding content.

**Verify:** `npm run build:css` succeeds and the login page renders correctly
at mobile and desktop widths.

## Category E — Correctly different, do not port

| Item | Reason |
|---|---|
| `projects` controller, routes, schema, service, templates | Portfolio's own domain feature. Under the fork ownership rule this is exactly what `src/admin/routes/project/` exists for |
| `Projects` sidebar entry | Same |
| `src/lib/icons.js`, `src/lib/post-meta.js` | Used only by `src/app/**` |
| Portfolio's `/coming-soon` and `/sitemap.xml` handling | Public-site behaviour |
| Email brand colours | Portfolio branding |
| `'unsafe-eval'` in the CSP | Present for Alpine; dashboard's templates contain no Alpine directives, so dashboard keeps the tighter policy |
| `src/admin/routes/manifest.js`, `routes/project/prefixes.js`, `nav.project.js` | Dashboard's fork seams; portfolio predates them |
| `src/admin/plugin.js` route registration | Dashboard autoloads, portfolio lists explicitly — the same seam work |
| `src/admin/templates/partials/sidebar.js` nav slot | Same |
| `src/admin/routes/auth.routes.js` | Trailing whitespace only |
| `src/admin/templates/utils/helpers.js` | Function ordering only; identical exports |
| `src/admin/templates/layouts/auth.js` | Import ordering only |

## Category F — Cleanup surfaced by the comparison

Not portfolio parity, but found during it and cheap to resolve.

`src/app.js` still registers static routes for `/vendor/htmx/`,
`/vendor/preline/` and `/vendor/apexcharts/`, serving straight from
`node_modules`. Since `2a05674` the templates load these from `/dist/js/`
instead, so the routes are unreferenced. Removing them shrinks the public
surface and removes three paths that expose `node_modules` contents.

Portfolio extracts its health check into `src/lib/health-check.js`; dashboard
inlines it in `src/app.js`. Cosmetic, no behavioural difference. **Skipped.**

Portfolio calls `loadCpanelEnvVars()` from its `env.js`; dashboard's `env.js`
has no such export, only `loadCpanelDomain()`. Dashboard's cPanel environment
reaches the process through Passenger's app registration, verified working
when `NODE_ENV` was corrected on 2026-08-25. **Skipped** — no evidence of a
gap.

## Risks

**A1 changes boot behaviour.** Refusing to start without a secret is correct
for a template but will stop a fork that previously ran on the fallback. It
must be called out in `docs/forking.md` and in the release notes for the tag
that carries it.

**C1 changes what existing chart data means.** Anyone with real
`dailyPageViews` history sees a discontinuity at the switchover.

**Nothing here is covered by existing tests.** Each item specifies its own
verification precisely because the two bugs that reached production were both
invisible to the test suite and to the deploy's health check.

## Out of scope, noted for later

Portfolio and dashboard will drift again. Nothing detects that automatically,
and the comparison above is a manual command run by hand. A periodic re-run —
or a check that fails when a shared file diverges — would turn this from an
audit into a standing guarantee. That is a separate piece of work.
