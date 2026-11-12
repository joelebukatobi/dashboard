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
git clone --branch <latest-tag> git@github.com:joelebukatobi/dashboard.git <project>
cd <project>
git switch -c main
sh scripts/fork-setup.sh <project> git@github.com:joelebukatobi/<project>.git
git commit -m "chore: set up fork"
git push -u origin main
```

`scripts/fork-setup.sh` renames dashboard's `origin` to `upstream`, adds the
fork's own `origin`, turns `.gitattributes.fork` into `.gitattributes`, sets
the package name, and sets the `ours` merge driver. It is safe to run more
than once.

**After cloning an existing fork, run `sh scripts/fork-setup.sh` once with no
arguments.** The `ours` merge driver is local git config, so it doesn't travel
with the repository. Without it, `merge=ours` in `.gitattributes` does
nothing, and fork-owned files conflict on every pull. The script also adds
`upstream` if the clone doesn't have one.

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

## Generating migrations in a fork

Never run plain `npm run db:generate` in a fork — it diffs the *whole* barrel,
including project tables, and writes them into dashboard's core folder. Use
`npm run db:generate:project`, which is scoped to
`src/db/schema/project.js`.

This is not hypothetical. Dashboard's own `0006_add_post_likes.sql` shipped
with `DROP TABLE board_members` and `DROP TABLE events` because it was
generated against a downstream database whose schema snapshot still held those
tables. It failed on every fresh database until it was repaired.

## Behaviour changes that affect existing installs

**Daily analytics changed meaning.** `daily_page_views.total_views` used to
hold a cumulative snapshot of every post view ever, written by
`scripts/cli.js analytics aggregate`. It now holds a per-day count,
incremented as views happen. Rows written under the old model are not
comparable with new ones, so clear them once when upgrading:

```sql
TRUNCATE TABLE daily_page_views;
```

The old aggregation function is gone entirely — it summed an all-time
counter into a single day's row, which cannot produce per-day data by
construction, so there is no backfill tool for pre-upgrade rows. The
simulation commands (`npm run simulate:day`, `npm run simulate:days`) still
populate a fresh install with plausible data.

**A secret is now required in production.** The app refuses to start when
`JWT_SECRET` is not set and `NODE_ENV` is
`production`. Previously it fell back to a value published in this
repository, which meant a fork that forgot the variable shipped a forgeable
session secret. Set one in your hosting environment before deploying.

## Sending a fix back up

Rare, and unsupported by tooling on purpose:

```bash
cd ../dashboard
git cherry-pick <sha-from-fork>
```

Only works cleanly for commits that touch core files exclusively.

## Deploying a fork

`.github/workflows/staging-deploy.yml` is the cPanel pipeline: build assets,
upload over FTPS, then `npm ci --omit=dev`, migrations, and a restart over
SSH, finishing with a `/health` check.

It fires on push to `staging` only. `dev` is where work happens, `staging` is
the deployed proving ground, and `main` is a release pointer that never
deploys — it is what a fork clones and what tags point at. In a fork the
target is the fork's own hosting, configured entirely through repository
secrets.

Required repository secrets: `CPANEL_FTP_HOST`, `CPANEL_FTP_USER`,
`CPANEL_FTP_PASSWORD`, `DEPLOY_PATH`, `DATABASE_URL`, `URL`, and
`CPANEL_SSH_KEY` for the restart step. `URL` must be the fork's own
base URL — the deploy fails loudly if it is unset rather than checking
somebody else's site.

## Portfolio: a fork that predates this model

Portfolio is dashboard's oldest fork, and came first — the admin CMS in this
repo was originally extracted from portfolio's own codebase, not the other
way around. The ownership split above was formalized later, so portfolio
never adopted `routes/project/` or `nav.project.js`. Its one project feature
(a Projects admin section) is wired directly into core-owned files instead:
the route is hardcoded into `plugin.js`'s registration list rather than
autoloaded, and the sidebar nav entry is a literal `<a href="/admin/projects">`
in `sidebar.js` rather than an entry in a fork-owned `nav.project.js`.

This means a `git merge` pull from dashboard will conflict on `plugin.js` and
`sidebar.js` specifically — portfolio edited core files to add project
content, which is exactly the rule violation described above. Until
portfolio migrates those two additions into `routes/project/posts.routes.js`
(or similar) and `nav.project.js`, expect to resolve those two files by hand
on every pull, keeping portfolio's project line and dashboard's everything
else.

Two differences that looked like gaps on inspection and are not:

- **Favicon.** Dashboard resolves the configured site icon server-side with
  a disk-existence check and fallback (`sendFavicon` in `src/app.js`).
  Portfolio instead points `<link rel="icon">` straight at the configured
  icon's own URL, falling back to a static file only when unset. Both solve
  "each fork shows its own icon"; portfolio's is simpler because `<link>`
  tags have no `onerror` fallback to begin with, so dashboard's extra
  missing-file handling buys it nothing there.
- **Dashboard's Top Posts widget fix.** Dashboard once had two divergent
  renderers for this widget (full page vs. HTMX fragment refresh) that had
  drifted onto different CSS classes. Portfolio never had this bug — it was
  already calling one shared `getTopPosts()` from both paths. The only
  actual difference is CSS: dashboard uses a `panel-empty` SCSS component,
  portfolio uses inline Tailwind utility classes for the same empty state.

One real gap, the other direction, now closed: dashboard's list pages
(posts/albums/categories/tags) had no responsive handling on row actions —
portfolio added `lg:hidden` text labels and smaller icon sizing below the
desktop breakpoint, dashboard rendered icon-only regardless of viewport.
Ported into dashboard's shared `render*Row()` for each page, which fixed it
in both the full page render and the HTMX fragment at once — portfolio's own
version only applied it to the fragment.
