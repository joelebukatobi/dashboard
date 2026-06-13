# Security

Baseline for the template. Forks extend for project-specific threat models.

## Input validation

All mutations use **Zod** at the route layer.

| Area | Location |
|------|----------|
| Auth | `validators.js`, `schemas/auth.schema.js` |
| CRUD | `schemas/{resource}.schema.js` |
| Public API | `schemas/api.schema.js` |
| Setup | `schemas/setup.schema.js` |

Controllers must not re-validate fields already in schemas. Multipart uploads validate in the service layer.

## HTML escaping

| Syntax | Escapes? | Use for |
|--------|----------|---------|
| `${value}` | Yes | User/database text |
| `!${html}` | No | Trusted fragments you composed |
| `escapeHtml(str)` | Manual | Strings built outside templates |

Never `!${}` on raw user input. Rich text: sanitize on write or at render — document the choice in your fork.

## Authentication

- JWT in HTTP-only, `SameSite=strict` cookie
- `authenticate` + `requireAdmin` on protected routes
- Login rate limiting in `auth.controller.js` (in-memory; use Redis in production)

## Password policy

`validatePasswordStrength()` in `src/utils/security.js`: min 8 chars, upper, lower, digit, special.

## Production headers

`@fastify/helmet` with CSP when `NODE_ENV !== 'development'`.

## Secrets

Never commit `.env` or credentials. `DATABASE_URL`, JWT secret, and mail config via environment only.

## CI

```bash
npm run check
```
