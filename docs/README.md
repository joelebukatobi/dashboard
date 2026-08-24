# Documentation

Reusable **Fastify + HTMX** base template for admin dashboards and public sites. Fork for blog CMS, portfolio, talks, projects, etc.

## Start here

| Doc | Read when… |
|-----|------------|
| [AGENTS.md](./AGENTS.md) | You're an AI agent or need commands + session checklist |
| [conventions.md](./conventions.md) | You need rendering, validation, or folder layout rules |
| [recipes.md](./recipes.md) | You're forking the base or adding admin/public features |
| [forking.md](./forking.md) | You're spinning off a new site and need ownership rules + sync workflow |

## Guides

| Doc | Topic |
|-----|-------|
| [security.md](./security.md) | Validation, escaping, auth |
| [testing.md](./testing.md) | Vitest, smoke tests, CI |
| [styling.md](./styling.md) | Tailwind v4 + SCSS + BEM pipeline |
| [development.md](./development.md) | Git workflow, verification, troubleshooting |

## Reference

| Location | Use for |
|----------|---------|
| `src/admin/routes/` | Admin route definitions |
| `src/admin/schemas/` | Zod validation schemas |
| `src/db/schema/core.js` | Database tables (dashboard-owned) |
| `src/db/schema/project.js` | Database tables (fork-owned, empty here) |
| `src/services/` | Business logic |

## Stack

Fastify · HTMX · fastify-html · Tailwind v4 · SCSS (BEM) · MySQL/PostgreSQL · Drizzle ORM

## Verify changes

```bash
npm run check          # guardrails + tests
npm run build:css      # after SCSS changes
node scripts/cli.js help
```
