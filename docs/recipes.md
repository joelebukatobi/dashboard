# Recipes

How to fork this base and add features without rewriting core patterns.

## Forking the base

1. Fork the repo; update `package.json` name/description; set `.env.local`
2. **Keep** `renderAdminPage` / `renderAppPage`, Zod middleware, plugin layouts, `npm run check`
3. Customize public surface (`src/app/templates/`, `app/plugin.js`)
4. Add domain modules (admin CRUD, public pages) — additive only
5. Add `tests/modules/` in your fork for new resources
6. Ship when `npm run check`, `npm run build:css`, and `npm run db:migrate` pass

---

## Add an admin module

Reference: **categories** (`src/admin/routes/categories.routes.js` and friends).

### 1. Database

Drizzle schema + migration in `src/db/`, then `npm run db:generate` and `npm run db:migrate`.

### 2. Service

`src/services/{resource}.service.js` — business logic only, no HTTP or HTML.

### 3. Schema

`src/admin/schemas/{resource}.schema.js`:

```javascript
import { z } from 'zod';

export const createTalkSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  slug: z.string().trim().max(255).optional().or(z.literal('')),
});

export const updateTalkSchema = createTalkSchema;
export const talkListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
```

Reuse `common.schema.js` (`resourceIdSchema`, pagination helpers).

### 4. Controller

`src/admin/controllers/{resource}.controller.js` — validated input in, render helpers out.

### 5. Templates

`src/admin/templates/pages/{resource}.js`:

```javascript
export function talksMeta({ title = 'Talks' }) { /* … */ }
export function talksContent({ items, pagination }) { /* … */ }
export function talksTableFragment({ items }) { /* … */ }
```

### 6. Routes

```javascript
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { resourceIdSchema } from '../schemas/common.schema.js';

fastify.get('/', { preHandler: [auth, validateQuery(talkListQuerySchema)], handler: … });
fastify.post('/', { preHandler: [auth, validateBody(createTalkSchema)], handler: … });
```

### 7. Register

In `src/admin/plugin.js`:

```javascript
await fastify.register(import('./routes/talks.routes.js'), { prefix: '/talks' });
```

Add a sidebar link in `src/admin/templates/partials/sidebar.js`.

### Checklist

- [ ] Schemas: create, update, list query, params
- [ ] All POST/PUT/PATCH use `validate*`
- [ ] Controller uses render helpers only
- [ ] Meta + Content + TableFragment
- [ ] Registered in `admin/plugin.js`
- [ ] `npm run check` passes

---

## Add a public page

Reference: `src/app/templates/home/`, `src/app/routes/public.routes.js`.

### Shells

In `src/app/templates/layouts/app.js`:

| Shell | Use |
|-------|-----|
| `buildAppShell` | Marketing / portfolio |
| `buildBlogShell` | Blog |
| `buildComingSoonShell` | Pre-setup (used by setup-check) |

Add new shells when a section needs different nav/footer.

### Template pattern

```javascript
export function talksIndexMeta({ title = 'Talks' }) {
  return { title, description: '…' };
}

export function talksIndexContent({ talks }) {
  return html`<main>…</main>`;
}
```

### Controller + route

```javascript
return renderAppPage(request, reply, talksIndexMeta({}), talksIndexContent({ talks }), {
  shell: buildAppShell,
});
```

Register in `src/app/plugin.js`:

```javascript
await fastify.register(import('./routes/talks.routes.js'), { prefix: '/talks' });
```

### Setup gate

Until the first admin user exists, `setup-check.js` shows coming soon on `/` and redirects other public routes. Exempt paths: `/health`, `/api/*`, `/admin/auth/*`. Add exceptions sparingly.

### Checklist

- [ ] Meta + Content exports
- [ ] `renderAppPage` with chosen shell
- [ ] Route in `app/plugin.js`
- [ ] No `reply.type('text/html').send` in `src/app/`
- [ ] `npm run build:css` if SCSS changed
