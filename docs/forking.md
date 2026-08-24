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

## Generating migrations in a fork

Never run plain `npm run db:generate` in a fork — it diffs the *whole* barrel,
including project tables, and writes them into dashboard's core folder. Use
`npm run db:generate:project`, which is scoped to
`src/db/schema/project.js`.

This is not hypothetical. Dashboard's own `0006_add_post_likes.sql` shipped
with `DROP TABLE board_members` and `DROP TABLE events` because it was
generated against a downstream database whose schema snapshot still held those
tables. It failed on every fresh database until it was repaired.

## Sending a fix back up

Rare, and unsupported by tooling on purpose:

```bash
cd ../dashboard
git cherry-pick <sha-from-fork>
```

Only works cleanly for commits that touch core files exclusively.

## Rehearsing a deploy locally

`npm run deploy:rehearse` runs the cPanel deploy pipeline against local
stand-in containers — Passenger + nginx + sshd for the hosting account,
pure-ftpd for the upload, and a throwaway MySQL. Requires Docker.

It proves: path resolution, that the exclude list keeps `node_modules`,
`.env*`, and `.git` off the server, `npm ci --omit=dev`, connectivity to a
fresh database, the full migration chain, that `tmp/restart.txt` restarts the
app under Passenger, and that the restarted app answers `/health`.

It does not prove: LiteSpeed/`.htaccess` routing, shared-hosting resource
limits, FTPS/TLS negotiation, or `SamKirkland/FTP-Deploy-Action` itself — the
rehearsal uploads with a stand-in whose exclude semantics are pinned by
`tests/unit/deploy/exclude-list.test.js`.

Tear down with `npm run deploy:rehearse:down`.
