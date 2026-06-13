# Development

Workflow, git conventions, and troubleshooting.

## Daily workflow

```bash
npm run dev              # server + CSS watcher
npm run check            # before marking work done
npm run build:css        # after SCSS changes
npm run db:migrate       # after schema changes
```

## Verification

1. Run `npm run check` (guardrails + 16 tests)
2. Manually smoke affected pages if UI changed
3. For new routes: confirm Zod schema wired and controller uses render helpers

Plan mode for non-trivial tasks (3+ steps or architectural decisions). Re-plan if something goes sideways.

## Git commits

Small, logical commits. Conventional prefixes:

| Prefix | Use |
|--------|-----|
| `feat:` | New functionality |
| `fix:` | Bug fix |
| `refactor:` | Restructure, no behavior change |
| `style:` | CSS/SCSS only |
| `docs:` | Documentation |
| `chore:` | Build, deps, scripts |
| `test:` | Tests |

Example breakdown for a feature: schema → service → controller → templates → routes (one commit each where sensible).

Commit locally often; push when ready. Ask before pushing to main.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run db:seed` | Demo data |
| `npm run db:reset` | Migrate + fresh seed |
| `npm run setup:token` | First-launch setup URL |
| `npm run simulate:day` | Dev analytics data |
| `node scripts/cli.js help` | Full maintenance CLI |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CSS not updating | `npm run build:css` |
| DB connection fails | Check `DATABASE_URL` in `.env.development` or `.env.local` |
| Tests fail | `npm test -- --reporter=verbose` |
| Route validation check fails | Add `validateBody` / `validateQuery` / `validateParams` on mutating routes |
| Login blocked before setup | Expected — `/admin/auth/*` works without users; public routes need setup first |

## Lessons learned

After corrections, add patterns to `tasks/lessons.md` so they are not repeated.
