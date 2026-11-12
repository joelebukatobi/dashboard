import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { createSigner } from 'fast-jwt';

const { ensureDatabaseUrl } = await import('../../env.js');
ensureDatabaseUrl({ scriptName: 'boosted-nav.test' });

const { default: app } = await import('../../src/app.js');
const { getAppSecret } = await import('../../src/lib/app-secrets.js');
const { authService } = await import('../../src/services/auth.service.js');
const { db, users } = await import('../../src/db/index.js');
const { eq } = await import('drizzle-orm');

describe('boosted sidebar nav', () => {
  /** @type {import('fastify').FastifyInstance} */
  let server;
  let token;

  beforeAll(async () => {
    server = Fastify({ logger: false });
    await server.register(app);
    await server.ready();

    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
    token = createSigner({ key: getAppSecret() })({ userId: admin.id, email: admin.email, role: admin.role });
    await authService.createSession(admin.id, false, token);
  });

  afterAll(async () => {
    await server.close();
  });

  it('a plain full page load carries the boost attributes but no OOB markers', async () => {
    const res = await server.inject({ method: 'GET', url: '/admin/categories', cookies: { token } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('id="main-content"');
    expect(res.body).toContain('hx-boost="true"');
    expect(res.body).not.toContain('hx-swap-oob');
  });

  it('a boosted-nav request returns full inner content plus OOB sidebar and breadcrumb', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/admin/categories',
      cookies: { token },
      headers: { 'hx-request': 'true', 'hx-boost-nav': 'true' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('<!doctype');
    // Full content, not the narrower search/pagination table fragment.
    expect(res.body).toContain('page-header__title');
    expect(res.body).toContain('id="admin-sidebar"');
    expect(res.body).toContain('id="breadcrumb-nav"');
    // Both OOB fragments must actually be live HTML (ghtml escapes any
    // interpolated value not immediately preceded by `!` in the template
    // literal -- ran into this exact bug wiring the fix up).
    expect(res.body).toMatch(/id="admin-sidebar"[^>]*hx-swap-oob="true"/);
    expect(res.body).toMatch(/id="breadcrumb-nav"[^>]*hx-swap-oob="true"/);
    // Active state reflects the destination page, not wherever the click
    // originated.
    expect(res.body).toMatch(/<a href="\/admin\/categories"[^>]*sidebar__item--active/);
  });

  it('a plain htmx request (pagination/search) still returns only the narrow table fragment, with no OOB nav', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/admin/categories',
      cookies: { token },
      headers: { 'hx-request': 'true' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('page-header__title');
    expect(res.body).toContain('<table');
    expect(res.body).not.toContain('hx-swap-oob');
  });
});
