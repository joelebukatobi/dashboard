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

  it('GET /api/v1/settings returns public settings JSON', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/settings',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      siteName: expect.any(String),
      siteTagline: expect.any(String),
      siteUrl: expect.any(String),
      postsPerPage: expect.any(Number),
      commentsEnabled: expect.any(Boolean),
      social: {
        twitter: expect.any(String),
        facebook: expect.any(String),
        linkedIn: expect.any(String),
        github: expect.any(String),
        links: expect.any(Array),
      },
    });
  });

  it('GET /favicon.svg returns an image response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/favicon.svg',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /admin/auth/totp redirects to login without pending session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/admin/auth/totp',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/auth/login');
  });

  it('GET /admin/auth/totp-setup redirects to login without pending session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/admin/auth/totp-setup',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/auth/login');
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
