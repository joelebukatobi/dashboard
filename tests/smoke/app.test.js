import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import app from '../../src/app.js';

describe('app smoke', () => {
  /** @type {import('fastify').FastifyInstance} */
  let server;

  beforeAll(async () => {
    server = Fastify({ logger: false });
    await server.register(app);
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /health returns healthy status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /admin/auth/login returns login page HTML', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/admin/auth/login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.body).toContain('Welcome Back');
    expect(response.body).toContain('hx-post="/admin/auth/login"');
  });

  it('POST /api/v1/subscribe rejects missing email before DB', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/subscribe',
      payload: {},
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: expect.any(String) });
  });
});
