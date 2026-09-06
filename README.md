# dashboard

A self-hosted blog CMS that runs on **cheap cPanel shared hosting** — a few
dollars a month, no VPS, no Docker, no platform bill. If your host has the
Node.js Selector, it can run this. It is also the base other sites are forked
from.

Fastify + HTMX server-rendered admin at `/admin`, public site at `/`, MySQL via
Drizzle ORM. No build step at runtime, no client framework, no Redis.

---

## Why cPanel is the point

A VPS is lovely. It is also a monthly bill plus a second job: you patch the OS,
babysit the process manager, renew the certificates, and configure the reverse
proxy — before you have written a single line of your actual site. A managed
platform removes that work and hands you a larger bill instead, usually metered
per build minute, per seat, or per gigabyte of egress.

Meanwhile a cPanel shared host costs a few dollars a month, comes with the
database, TLS, mail, backups and a control panel already wired up — and, since
Passenger and the Node.js Selector arrived, **it can run a real Node app.** Most
people never find out, because almost every Node project assumes infrastructure
that shared hosting does not have.

This one assumes the opposite. **Passenger, a shared filesystem, and a hosting
panel are the deployment target**, and every design decision follows from that:
no Docker, no container registry, no Redis, no build step at runtime, no client
framework to serve from a CDN you would have to pay for.

The trade is real and worth stating plainly: you get no root, capped CPU and
memory, and a filesystem shared with other tenants. If you need horizontal
scaling or background workers under sustained load, buy the VPS. For a blog,
a portfolio, a small publication — the things this CMS is for — the cheap box
is not a compromise, it is simply the right size.

What follows is what that costs in engineering, and what this codebase does to
pay it.

| Constraint on cPanel | What this codebase does about it |
| --- | --- |
| No Docker, no process manager of your own | Passenger runs `app.js`; deploy touches `tmp/restart.txt` to restart it |
| `node_modules` cannot be uploaded over FTP | The deploy SSHes in and runs `npm ci --omit=dev` on the server |
| Slow shared filesystem | Dependencies reinstall only when `package-lock.json`'s hash changes |
| No CDN or asset pipeline | Frontend deps are bundled to `dist/js/` at build and self-hosted |
| Browsers cache aggressively behind the panel | `dist/asset-version.txt` stamps the deploy SHA; assets are served `?v=<sha>` |
| Env vars live in the panel, not a `.env` | `env.js` reads cPanel's `~/.cl.selector/node-selector.json` as a fallback |
| A failed FTP sync can silently leave the old release running | Post-deploy checks refuse to pass unless the live app reports the pushed SHA |

That last row is the one worth reading twice. A green deploy here means the
running app *is* the commit you pushed — not merely that something answered.

---

## Stack

- **Fastify 4** with `fastify-html` for server-rendered pages
- **HTMX + Alpine + Preline** for interactivity, no SPA
- **Drizzle ORM** on **MySQL** (`mysql2`)
- **Tailwind v4** (`@theme` in CSS) alongside **SCSS/BEM**
- **Vitest** for unit and smoke tests; Playwright available for e2e
- **Node 24**, ESM throughout

Auth is JWT in an httpOnly cookie, with TOTP two-factor via `otplib`.

---

## Quick start

```bash
git clone git@github.com:joelebukatobi/dashboard.git
cd dashboard
npm install
cp .env.example .env.local     # set DATABASE_URL and JWT_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Then open `http://localhost:7000` and visit `/admin`. On a fresh database the
first-launch wizard creates the admin account:

```bash
npm run setup:token            # prints the one-time setup URL
```

### Environment

`.env.example` lists only variables the code actually reads. The two that
matter:

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — signs session tokens and encrypts stored settings such as the
  SMTP password. **The app refuses to start in production without it.**

SMTP, OAuth and upload limits are configured in the admin Settings page and
stored in the database, not in env.

`NODE_ENV` is binary, as Node intends: `production` on every hosted box —
staging included — and `development` only on your machine. Anything other than
`production` disables helmet, CSP, rate limiting and idle session expiry.

---

## Deployment to cPanel

`staging` is the only branch that deploys. The pipeline is
`.github/workflows/staging-deploy.yml` and runs in this order:

1. **Checks gate** — the full `check.yml` workflow runs first as
   `workflow_call`; the deploy job is `needs: check`, so nothing ships from a
   red build.
2. **Build** — `build:css` and `build:js` produce `dist/`, then the commit SHA
   is stamped into `dist/asset-version.txt`.
3. **Upload** — FTPS sync, excluding `node_modules`, `.env*`, `public/uploads`
   and `tmp/`. Uploads are incremental via a sync-state file.
4. **Install and migrate** — over SSH: `npm ci --omit=dev` (skipped when the
   lockfile hash is unchanged), a database connectivity probe, then
   `npm run db:migrate`.
5. **Restart** — writes `tmp/restart.txt`, which Passenger watches.
6. **Verify** — three scripts that must all pass:
   - `verify-remote-health.sh` — `/health` reports `status: healthy`, no failed
     checks, `environment: production`, the expected asset version, and an
     uptime that *grows* across samples (a crash loop fails here)
   - `verify-remote-artifacts.sh` — `dist/asset-version.txt` matches the pushed
     SHA and every built asset is actually served over HTTP
   - `verify-remote-smoke.sh` — admin login page, versioned CSS, and home page
     all respond

### Required repository secrets

| Secret | Used for |
| --- | --- |
| `CPANEL_FTP_HOST`, `CPANEL_FTP_USER`, `CPANEL_FTP_PASSWORD` | FTPS upload |
| `CPANEL_SSH_HOST`, `CPANEL_SSH_USER`, `CPANEL_SSH_KEY` | install, migrate, restart |
| `DEPLOY_PATH` | target directory on the server |
| `DATABASE_URL` | migrations during deploy |
| `URL` | base URL the post-deploy checks probe |

Missing secrets fail fast at `scripts/deploy/validate-secrets.sh`, which names
the one that's absent.

### On the server

Point cPanel's **Setup Node.js App** at your deploy directory with `app.js` as
the entrypoint, Node 24, and `NODE_ENV=production`. Set `DATABASE_URL` and
`JWT_SECRET` in the panel's environment variables — `env.js` will find them
there even without a `.env` file present.

---

## Branch model

| Branch | Role |
| --- | --- |
| `dev` | where work happens; runs Checks on push |
| `staging` | the only deployed branch; gated by Checks, then verified live |
| `main` | release pointer that forks clone; runs Checks, never deploys |

---

## Forking

Dashboard is designed to be forked into other sites. The governing rule: **every
file has exactly one owner, and no file is edited by both dashboard and a fork.**

Core fixes are made here and pulled down, never patched in the fork. The seams
that make this work — an autoloading route manifest, a split schema barrel, a
navigation injection slot, namespaced migrations — are documented in
[docs/forking.md](docs/forking.md).

---

## Scripts

```bash
npm run dev              # server + CSS watcher
npm run check            # guardrails + full test suite
npm test                 # vitest
npm run db:migrate       # apply migrations
npm run db:seed          # seed core content
npm run db:studio        # Drizzle Studio
npm run setup:token      # print the first-launch setup URL
```

Scripts that fabricate data — `db:seed`, `analytics day|run|scheduler`,
`maintenance update-views` — refuse to run unless `NODE_ENV=development`, so a
stale `DATABASE_URL` cannot write invented traffic into a real database.
`ALLOW_LOCAL_SIMULATION=true` overrides that deliberately.

---

## Documentation

- [docs/development.md](docs/development.md) — local workflow
- [docs/forking.md](docs/forking.md) — fork ownership and merge policy
- [docs/conventions.md](docs/conventions.md) — code conventions
- [docs/styling.md](docs/styling.md) — SCSS/BEM and Tailwind usage
- [docs/testing.md](docs/testing.md) — test layout
- [docs/security.md](docs/security.md) — auth, secrets, CSP
- [docs/recipes.md](docs/recipes.md) — common tasks
