import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import fastifyHtml from 'fastify-html';
import { htmxRedirect } from '../../../src/admin/render.js';

// Bulk actions post a plain form; htmx requests expect HX-Redirect instead.
describe('htmxRedirect', () => {
  const app = Fastify();
  app.register(fastifyHtml);
  app.post('/go', (request, reply) => htmxRedirect(reply, '/admin/media/images?view=table'));

  it('sends HX-Redirect to htmx requests', async () => {
    const res = await app.inject({ method: 'POST', url: '/go', headers: { 'hx-request': 'true' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['hx-redirect']).toBe('/admin/media/images?view=table');
  });

  it('redirects a plain form post with a 303', async () => {
    const res = await app.inject({ method: 'POST', url: '/go' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/admin/media/images?view=table');
  });
});
