# Fork & Downstream Sync Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Repo:** `dashboard-v2` (BlogCMS)

## Problem

Dashboard is becoming the base for other sites. Each new site is a full fork:
same stack, same repo layout, `/admin` and `/` both served from the fork. Each
fork grows its own domain features (events, departments, and so on) that must
never travel back to dashboard.

When dashboard later gains a fix — an auth bug, a media picker improvement —
that fix needs to reach the running forks without a painful merge. Today it
would not: five files are edited by both sides on every fork, so every
`git merge upstream` conflicts.

## Goals

- A fork can pull dashboard changes down with a clean, boring merge.
- A fork adds tables, admin screens, routes, and a whole client-facing site
  without editing any file dashboard also edits.
- Dashboard stays a single working application, not a framework or a package.

## Non-Goals

- Pushing fork changes back upstream as a routine workflow. It stays available
  as an occasional `git cherry-pick`, but nothing is built to support it.
- A plugin or hook system.
- Extracting the core as an npm package. Revisit at project #3.
- Sharing the client-facing site (`src/app`) between dashboard and forks.

## Direction

The design rests on one rule:

> Every file has exactly one owner. No file is edited by both dashboard and a
> fork.

Dashboard's job is to make that rule *possible* — today several core files are
hardcoded lists that a fork has no choice but to edit. Four seams fix that by
turning each list into something a fork appends to instead.

Core fixes are made in dashboard and pulled down. A fork that hotfixes a core
file has created a divergence, and must either cherry-pick it upstream or
revert it before the next pull.

## Ownership Map

**Core — dashboard owns; a fork never edits these:**

```
src/admin/**            controllers, routes, templates, schemas, middleware
src/lib/ src/services/ src/utils/ src/middleware/ src/plugins/
src/db/schema/core.js
src/db/migrations/*.sql dashboard's own numbering
scss/admin/**  css/index.css
scripts/  src/server.js  src/app.js
```

**Project — the fork owns; dashboard ships a stub or dummy:**

```
src/app/**              the whole client-facing side: / routes, templates
scss/app/**  css/app.css
src/db/schema/project.js        empty upstream
src/db/migrations/project/      own folder, own journal, own tracking table
src/admin/routes/project/       admin CRUD for fork-only features
src/admin/nav.project.js        empty upstream
package.json name, .env files
```

`src/app` is fork territory. Dashboard's current `home` and `blog` pages are
reference material — a fork replaces them wholesale, and dashboard's version
never merges down.

## Seams

### Seam 1 — Route lists become autoloaded

**Today:** `src/admin/plugin.js` registers eleven admin page routes by hand, and
`src/app.js:189-196` registers eight API routes by hand. A fork adding
`events.routes.js` must edit both.

**Change:** glob `src/admin/routes/*.routes.js` and
`src/admin/routes/api/*.routes.js`, deriving the prefix from the filename
(`posts.routes.js` → `/admin/posts`). Keep an explicit override map for the
routes whose prefixes do not follow the filename:

- `comments` → `/admin/posts/:postId/comments`
- `images` → `/admin/media/images`
- `videos` → `/admin/media/videos`
- `albums` → `/admin/media/albums`
- `comments` (API) → `/api/v1`
- `subscribers` (API) → `/api/v1`
- `settings` (API) → `/api/v1`

`setup.routes.js` stays registered explicitly at `src/app.js:90` — it must load
before the setup-check middleware and is not part of the autoloaded set.

Also glob `src/admin/routes/project/*.routes.js`, which is empty in dashboard.

This is the only seam with real risk. A prefix silently derived wrong breaks a
route with no error. Every existing route needs a test asserting its final
registered path.

### Seam 2 — Schema splits, barrel stays put

**Today:** `src/db/schema.js` is one 456-line file. A fork appends its tables
there and conflicts on every pull.

**Change:** move the current contents to `src/db/schema/core.js`. Add
`src/db/schema/project.js`, which exports nothing in dashboard. Rewrite
`src/db/schema.js` as a barrel:

```js
export * from './schema/core.js';
export * from './schema/project.js';
```

Keeping the barrel at the original path means every existing
`import ... from '.../db/schema.js'` keeps working, and `drizzle.config.js`
needs no change.

**Boundary:** a fork can add tables and point foreign keys at core tables
freely — importing from `core.js` is not editing it. A fork cannot reshape a
core table. Drizzle has no table-extension mechanism and allows only one
`relations()` call per table, so both a new column on `posts` and a new
`many()` on `postsRelations` would require editing `core.js`.

Where a fork needs to associate its data with a core table, use a side table in
`project.js` (`post_events` with `postId` and `eventId` foreign keys). Where a
column genuinely belongs on every site, add it to dashboard and pull it down.

### Seam 3 — Nav injection point

**Today:** `src/admin/templates/partials/sidebar.js` is hardcoded HTML across
three `sidebar__menu` groups. A fork adding an "Events" link edits it.

**Change:** add `src/admin/nav.project.js` exporting an empty array in
dashboard, and one interpolation slot in `sidebar.js` that renders those items
as an additional menu group, omitted entirely when the array is empty.

Deliberately *not* restructuring the whole sidebar into a data-driven nav
config. One injection point is a far smaller diff and solves the actual
problem.

### Seam 4 — Migration namespacing

**Today:** `src/db/migrations/` is one flat numbered sequence with one journal.
A fork's `0007_events.sql` collides with dashboard's next `0007_*.sql`, and the
two journals disagree after a merge.

Dashboard already shows the failure mode: `0003_add_setup_tokens.sql` exists on
disk but is absent from `meta/_journal.json`, orphaned by an earlier collision
with `0003_add_custom_tables.sql`.

**Change:** a fork gets `src/db/migrations/project/` with its own journal,
generated by its own `drizzle.project.config.js` (schema pointed at
`src/db/schema/project.js`, `out` at the project folder). `scripts/migrate.js`
runs core migrations first, then the project folder if it exists, passing
`migrationsTable: '__drizzle_migrations_project'` so the two sequences track
independently and can never renumber each other.

Dashboard's own orphaned `0003_add_setup_tokens.sql` gets resolved as part of
this work.

## Git Workflow

**Fork creation:**

```bash
git clone git@github.com:joelebukatobi/dashboard-v2.git <project>
cd <project>
git remote rename origin upstream
git remote add origin git@github.com:joelebukatobi/<project>.git
git push -u origin main
```

**Merge protection:** the fork adds a `.gitattributes` marking project paths
with a `merge=ours` driver, plus the one-time
`git config merge.ours.driver true`. A down-merge then cannot clobber the
fork's client-facing side even if dashboard changed the same paths.

```
src/app/**              merge=ours
scss/app/**             merge=ours
src/db/schema/project.js merge=ours
package.json            merge=ours
```

**Pull ritual, on a branch:**

```bash
git fetch upstream
git checkout -b sync/<version>
git merge upstream/main
npm run db:migrate
npm run check
```

**Release tagging:** dashboard tags releases (`v1.2.0`) so forks pull to a
known-good point rather than a moving `dev` branch.

## Testing

- Every currently-registered admin and API route gets a test asserting its
  final path after autoload. This is the safety net for Seam 1.
- A migration test asserting core and project folders apply independently and
  in order.
- Existing `npm run check` must pass unchanged — the seams are refactors and
  should alter no behavior.

## Risks

- **Autoload prefix drift.** Mitigated by route-path tests, which must be
  written before the autoloader replaces the explicit lists.
- **Discipline, not tooling.** Nothing prevents a fork from editing a core
  file. `.gitattributes` protects fork-owned paths from dashboard, not the
  reverse. A merge conflict in a core file is the signal that the rule was
  broken.
- **`src/app` divergence is permanent and intended.** Improvements to
  dashboard's dummy client site never reach forks. If a client-facing pattern
  proves broadly useful, it belongs in `src/lib` or `src/admin`, which do
  travel.
