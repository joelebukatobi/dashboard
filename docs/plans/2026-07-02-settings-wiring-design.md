# Settings Wiring Design

**Date:** 2026-07-02  
**Status:** Approved (pending implementation plan)  
**Purpose:** Make admin settings functional end-to-end and expose safe values via public API. Designed for portability to sister projects (e.g. `~/Projects/portfolio`).

---

## Summary

Wire saved settings into runtime behavior: sidebar branding, favicon, layered OG meta, public pagination, comments policy, production session idle timeout, optional per-user 2FA, date formatting, and `GET /api/v1/settings`.

**Architecture:** Settings plugin (Approach A) with short TTL cache + shared helpers.

---

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Site icon | Upload **or** media library picker → single `siteIcon` path; fallback Lucide + `/favicon.svg` |
| 2FA | Site setting = feature flag; **optional per user** on profile/edit |
| Session timeout | **Idle** timeout; production only; normal = `sessionTimeout` min; remember-me = 7-day idle |
| Comments off | Approved comments still visible; no new submissions; admin unchanged |
| Moderation on | New public comments → `PENDING` |
| Public API | `GET /api/v1/settings` — read-only, no secrets |
| OG meta | Layered: settings defaults + page overrides on all layouts |
| Posts per page | All **public** paginated surfaces (blog, comments API, future lists) |
| Language | Remove from settings UI |
| Email | Leave placeholder for now |

---

## Database changes

> **Copy to sister projects:** run migration + update `schema.js` together.

### Migration: `users` table (2FA)

| Column | Type | Notes |
|--------|------|-------|
| `totp_secret` | `VARCHAR(255)` nullable | Encrypted TOTP secret |
| `totp_enabled` | `BOOLEAN` default `false` | User opted in |

Optional later: `totp_verified_at`, backup codes table — **not in v1**.

### Settings keys (no new table — `settings` rows)

| Key | Group | Type | New/updated |
|-----|-------|------|-------------|
| `siteIcon` | GENERAL | STRING | **New** — public path to icon |
| `siteName` | GENERAL | STRING | Existing |
| `siteTagline` | GENERAL | STRING | Existing |
| `siteUrl` | GENERAL | STRING | Existing |
| `timezone` | GENERAL | STRING | Existing |
| `dateFormat` | GENERAL | STRING | Existing |
| `language` | GENERAL | — | **Remove from UI** (row can remain in DB) |
| `postsPerPage` | CONTENT | NUMBER | Existing |
| `enableComments` | CONTENT | BOOLEAN | Existing |
| `moderateComments` | CONTENT | BOOLEAN | Existing |
| `sessionTimeout` | SECURITY | NUMBER | Minutes (UI + seed aligned) |
| `requireStrongPasswords` | SECURITY | BOOLEAN | Existing |
| `twoFactorAuth` | SECURITY | BOOLEAN | Feature flag (not per-user) |
| `socialTwitter` | SOCIAL | STRING | Existing |
| `socialFacebook` | SOCIAL | STRING | Existing |
| `socialLinkedIn` | SOCIAL | STRING | Existing |
| `socialGitHub` | SOCIAL | STRING | Existing |

### Seed updates

- `scripts/seed.js` — add `siteIcon` optional; align `sessionTimeout` to minutes; remove `language` from seed if desired.

---

## New files

| File | Purpose |
|------|---------|
| `src/plugins/site-settings.js` | Load/cache settings; decorate `fastify.siteSettings` |
| `src/lib/site-meta.js` | `resolvePageMeta()`, `getPublicSettings()` shape |
| `src/lib/site-dates.js` | `formatSiteDate()` using `dateFormat` + `timezone` |
| `src/lib/site-pagination.js` | `getPublicPageLimit()` from `postsPerPage` |
| `src/admin/routes/api/settings.routes.js` | `GET /api/v1/settings` |
| `src/admin/controllers/api/settings.controller.js` | Public settings JSON |
| `src/admin/templates/partials/media-picker-modal.js` | Reusable picker for site icon (if not existing) |
| `src/db/migrations/XXXX_add_user_totp.sql` | 2FA columns |
| `tests/unit/lib/site-meta.test.js` | Meta fallback tests |
| `tests/unit/api/settings.test.js` | Public API smoke |

---

## Modified files (copy manifest)

> When syncing to a sister project, copy **all paths below** after the migration. Run `npm run db:migrate` and `npm run build:css` there.

### Core / plugin wiring

| File | Changes |
|------|---------|
| `src/app.js` | Register site-settings plugin; register settings API route; favicon from settings |
| `src/db/schema.js` | `totpSecret`, `totpEnabled` on `users` |

### Settings module

| File | Changes |
|------|---------|
| `src/services/settings.service.js` | `siteIcon`; `initializeDefaults()`; `getPublicSettings()` |
| `src/admin/controllers/settings.controller.js` | Icon upload + media pick; boolean false handling; wire `uploadLogo` → icon |
| `src/admin/routes/settings.routes.js` | Icon upload route (multipart) |
| `src/admin/schemas/settings.schema.js` | Stricter validation for known keys |
| `src/admin/templates/pages/settings/settings.js` | Icon UI; remove language; hidden false checkboxes |

### Auth & security

| File | Changes |
|------|---------|
| `src/services/auth.service.js` | Idle timeout (production); remember-me 7d idle; 2FA verify |
| `src/middleware/authenticate.js` | Enforce idle expiry |
| `src/admin/controllers/auth.controller.js` | 2FA login step |
| `src/admin/routes/auth.routes.js` | TOTP verify route |
| `src/admin/schemas/auth.schema.js` | Conditional strength from settings |
| `src/admin/templates/pages/login.js` | TOTP step UI |
| `src/utils/security.js` | `validatePasswordStrength` respects `requireStrongPasswords` setting |

### User 2FA enrollment

| File | Changes |
|------|---------|
| `src/admin/controllers/users.controller.js` | TOTP enroll/verify/disable |
| `src/admin/routes/users.routes.js` | 2FA enrollment routes |
| `src/admin/templates/pages/users/edit.js` | 2FA opt-in UI (when feature enabled) |
| `src/services/users.service.js` | TOTP fields read/write |

### Layout & branding

| File | Changes |
|------|---------|
| `src/admin/templates/partials/sidebar.js` | `siteName` + `siteIcon` from settings |
| `src/admin/templates/layouts/main.js` | Layered OG meta; dynamic title suffix |
| `src/admin/templates/layouts/auth.js` | Site name in title/meta |
| `src/admin/plugin.js` | Pass site settings into layout callback |
| `src/admin/auth-plugin.js` | Same for auth layout |
| `src/app/templates/layouts/app.js` | Layered OG meta |
| `src/app/render.js` | Pass meta resolver |
| `src/app/plugin.js` | Inject settings into public layout |

### Public app & API

| File | Changes |
|------|---------|
| `src/app/controllers/blog.controller.js` | `postsPerPage` from settings |
| `src/app/controllers/home.controller.js` | Meta defaults |
| `src/app/templates/pages/blog/index.js` | `formatSiteDate` |
| `src/app/templates/pages/blog/post.js` | `formatSiteDate` |
| `src/admin/controllers/api/comments.controller.js` | Pagination limit; enable/moderate gates |
| `src/admin/controllers/api/posts.controller.js` | Default pagination from settings |

### Admin dates (tables)

| File | Changes |
|------|---------|
| `src/admin/templates/utils/helpers.js` | `formatDate` delegates to site date helper |
| `src/admin/templates/pages/posts/list.js` | Uses shared formatter |
| `src/admin/templates/pages/categories/list.js` | Uses shared formatter |
| `src/admin/templates/pages/tags/list.js` | Uses shared formatter |
| `src/admin/templates/pages/users/list.js` | Uses shared formatter |
| `src/admin/templates/pages/albums/list.js` | Uses shared formatter |
| `src/admin/controllers/images.controller.js` | Remove local `formatDate` duplicate |
| `src/admin/controllers/videos.controller.js` | Remove local `formatDate` duplicate |

### Styles

| File | Changes |
|------|---------|
| `scss/admin/pages/_settings.scss` | Icon upload + media picker UI |
| `scss/admin/components/organisms/_sidebar.scss` | `sidebar__logo-icon img` sizing |

### Scripts & tests

| File | Changes |
|------|---------|
| `scripts/seed.js` | Settings defaults alignment |
| `tests/smoke/app.test.js` | `/api/v1/settings` smoke |

---

## Sister project copy checklist

```bash
# 1. Migration + schema
src/db/migrations/XXXX_add_user_totp.sql
src/db/schema.js

# 2. New modules (copy entire files)
src/plugins/site-settings.js
src/lib/site-meta.js
src/lib/site-dates.js
src/lib/site-pagination.js
src/admin/routes/api/settings.routes.js
src/admin/controllers/api/settings.controller.js

# 3. Modified files — use manifest above (rsync or manual cp)

# 4. On sister project
npm run db:migrate
npm run build:css
npm run check
```

**Order matters:** schema/migration first → services/lib → controllers/routes → templates → `app.js` registration last.

---

## Data flow

```
Settings DB
    ↓
site-settings plugin (cache ~60s)
    ↓
├─ sidebar / favicon / layouts (resolvePageMeta)
├─ GET /api/v1/settings (public JSON)
├─ blog + comments API (pagination, comment policy)
├─ auth middleware (idle timeout, production)
└─ formatSiteDate() in templates
```

---

## Public API response shape

```json
{
  "siteName": "My Blog",
  "siteTagline": "Thoughts and ideas",
  "siteUrl": "https://example.com",
  "siteIcon": "/public/uploads/site-icon.png",
  "social": {
    "twitter": "",
    "facebook": "",
    "linkedIn": "",
    "github": ""
  },
  "postsPerPage": 10,
  "commentsEnabled": true
}
```

---

## Out of scope (v1)

- Email / SMTP settings
- Per-user 2FA backup codes
- Admin table pagination tied to `postsPerPage`
- Separate OG image (uses `siteIcon` as fallback)

---

## Next step

Invoke **writing-plans** skill → `docs/plans/2026-07-02-settings-wiring-implementation.md`
