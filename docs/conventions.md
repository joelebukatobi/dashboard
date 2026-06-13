# Conventions

Core patterns for the base template. Downstream projects **extend** these — they do not rewrite them.

## Architecture

Hypermedia-driven app: the server returns HTML fragments; HTMX swaps them in the browser.

```
Browser (HTMX)  ←→  Fastify routes  →  controllers  →  services  →  Drizzle  →  DB
                         ↓
                    templates (fastify-html)  →  HTML response
```

### Directory layout

```
src/
├── app.js                  # App factory — registers plugins
├── admin/
│   ├── plugin.js           # /admin/* + main layout
│   ├── auth-plugin.js      # /admin/auth/* + auth layout
│   ├── render.js           # renderAdminPage, renderFragment, alerts
│   ├── middleware/         # validate.js, validate-setup.js
│   ├── schemas/            # Zod schemas per resource
│   ├── routes/             # Admin + API route modules
│   ├── controllers/
│   └── templates/
├── app/                    # Public site plugin
│   ├── plugin.js
│   ├── render.js
│   ├── routes/
│   └── templates/
├── services/               # Business logic (no HTTP/HTML)
├── db/                     # schema.js, migrations
└── middleware/             # authenticate, setup-check
```

### Layer rules

| Layer | Responsibility |
|-------|----------------|
| Routes | URL mapping, `preHandler` (auth + validation) |
| Controllers | HTTP only — call services, return via render helpers |
| Services | Business logic, return data |
| Templates | Markup only — Meta + Content + Fragment exports |

## Rendering

### Admin

| Use case | Function |
|----------|----------|
| Full page | `renderAdminPage(request, reply, meta, content)` |
| HTMX fragment | `renderFragment(reply, html)` |
| Empty swap | `renderEmpty(reply)` |
| Feedback | `errorAlert`, `successAlert` |
| Redirect | `htmxRedirect`, `htmxLocation` |

Layouts are registered in `auth-plugin.js` / `plugin.js` via `fastify-html` `addLayout`. **Never** call `reply.type('text/html').send(...)`, `mainLayout()`, or `authLayout()` in controllers.

### Public app

| Use case | Function |
|----------|----------|
| Full page | `renderAppPage(request, reply, meta, content, { shell })` |
| Shells | `buildAppShell`, `buildBlogShell`, `buildComingSoonShell` |

## Templates

Admin list pages export three pieces (categories is the reference):

```javascript
export function categoriesMeta({ title }) { /* … */ }
export function categoriesContent({ items, pagination }) { /* … */ }
export function categoriesTableFragment({ items }) { /* HTMX partial */ }
```

Shared helpers: `paginationHtml`, `toastQueryScript` in `src/admin/templates/utils/helpers.js`.

## Validation

Mutating routes use Zod + middleware from `src/admin/middleware/validate.js`:

```javascript
fastify.post('/', {
  preHandler: validateBody(createCategorySchema),
  handler: categoryController.create.bind(categoryController),
});
```

| Middleware | Use |
|------------|-----|
| `validateBody` | POST/PUT/PATCH bodies |
| `validateQuery` | List filters, pagination |
| `validateParams` | IDs, slugs |

Controllers trust validated `request.body` / `query` / `params`. Do not duplicate checks.

**Exceptions:** multipart uploads (service-layer validation); setup wizard (`validateSetupBody` for field errors).

## Route registration

```
src/app.js
  ├── admin/auth-plugin.js    → /admin/auth/*
  ├── admin/plugin.js         → /admin/*
  ├── admin/routes/api/*      → /api/v1/*
  └── app/plugin.js           → public pages
```

## File naming

| Kind | Pattern |
|------|---------|
| Routes | `{resource}.routes.js` |
| Controllers | `{resource}.controller.js` |
| Services | `{resource}.service.js` |
| Schemas | `{resource}.schema.js` |

## HTMX

```html
<form hx-post="/admin/categories" hx-target="#table-body" hx-swap="innerHTML">
```

```javascript
reply.header('HX-Redirect', '/admin/categories');
reply.header('HX-Trigger', JSON.stringify({ htmxToast: { message: 'Saved', type: 'success' } }));
```

## Guardrails

```bash
npm run check    # scripts/check.js + vitest
```

Checks: no legacy HTML send patterns; mutating routes have `validate*` preHandlers.
