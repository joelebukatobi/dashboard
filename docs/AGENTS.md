# Agent Guide

Workflow and quick reference for AI agents working on this codebase.

## Principles

1. **Plan first** for non-trivial tasks (3+ steps or architecture decisions)
2. **Minimal diffs** — match existing patterns; don't rewrite unrelated code
3. **Verify** — run `npm run check` before marking done
4. **Learn** — after corrections, update `tasks/lessons.md`

## Commands

```bash
npm run dev              # server + CSS watcher
npm run build:css        # after SCSS changes
npm run db:migrate       # after schema changes
npm run check            # guardrails + tests (run before done)
npm test                 # vitest watch
node scripts/cli.js help # maintenance CLI
```

## Must-follow patterns

Read [conventions.md](./conventions.md) for full detail. Non-negotiables:

- Admin HTML via `renderAdminPage` / `renderFragment` — never `reply.type('text/html').send`
- Zod on mutating routes — never duplicate validation in controllers
- Services return data; controllers handle HTTP only
- ES modules with `.js` extensions

## Adding features

| Task | Doc |
|------|-----|
| New admin CRUD | [recipes.md](./recipes.md#add-an-admin-module) |
| New public page | [recipes.md](./recipes.md#add-a-public-page) |
| Fork setup | [recipes.md](./recipes.md#forking-the-base) |

Reference implementation: **categories** module.

## Code style

- Files: kebab-case · Classes: PascalCase · Functions/vars: camelCase · DB columns: snake_case
- 2-space indent, single quotes, semicolons
- JSDoc `@param` / `@returns` on service methods

## Session checklist

1. Read [conventions.md](./conventions.md) if touching routes, templates, or validation
2. `npm run build:css` if SCSS changed
3. `npm run db:migrate` if schema changed
4. `npm run check` before done

## Docs index

[README.md](./README.md) · [conventions](./conventions.md) · [recipes](./recipes.md) · [security](./security.md) · [testing](./testing.md) · [styling](./styling.md) · [development](./development.md)
