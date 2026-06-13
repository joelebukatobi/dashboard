# Testing

The base tests **plumbing**, not every module. Forks add resource-specific tests.

## Commands

```bash
npm test              # watch mode
npm run test:unit     # schemas + middleware
npm run test:smoke    # app inject tests
npm run check         # guardrails + full run
npm run test:e2e      # Playwright (forks)
```

## Base coverage

| File | Tests |
|------|-------|
| `tests/unit/schemas/*.test.js` | Zod rejects bad input |
| `tests/unit/middleware/validate.test.js` | Validation middleware |
| `tests/smoke/app.test.js` | `/health`, login page, API validation |
| `scripts/check.js` | HTML patterns + route validation |

## Fork additions

```
tests/modules/talks.schema.test.js
tests/modules/talks.routes.test.js
tests/e2e/admin-talks.spec.js
```

Copy patterns from `tests/unit/schemas/category.schema.test.js`.

## Smoke test pattern

```javascript
import Fastify from 'fastify';
import app from '../../src/app.js';

const server = Fastify({ logger: false });
await server.register(app);
const res = await server.inject({ method: 'GET', url: '/health' });
expect(res.statusCode).toBe(200);
await server.close();
```

Prefer routes that do not need DB state: `/health`, `/admin/auth/login`, validation-only API rejects.

## CI

`.github/workflows/ci.yml`: `npm run check` + `npm run build:css`.
