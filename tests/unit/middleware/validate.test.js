import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validateBody } from '../../../src/admin/middleware/validate.js';

function createMocks(overrides = {}) {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn(),
    html: vi.fn((strings, ...values) => strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '')),
  };

  const request = {
    url: '/admin/categories',
    headers: {},
    body: {},
    ...overrides,
  };

  return { request, reply };
}

describe('validateBody', () => {
  const schema = z.object({
    title: z.string().min(1, 'Title is required'),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes parsed data to request.body', async () => {
    const { request, reply } = createMocks({ body: { title: 'News' } });
    const middleware = validateBody(schema);

    await middleware(request, reply);

    expect(request.body).toEqual({ title: 'News' });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns 400 JSON for API routes', async () => {
    const { request, reply } = createMocks({
      url: '/api/v1/categories',
      body: {},
    });
    const middleware = validateBody(schema);

    await middleware(request, reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, error: expect.stringContaining('title') })
    );
  });

  it('calls custom onFail handler', async () => {
    const { request, reply } = createMocks({ body: {} });
    const onFail = vi.fn();
    const middleware = validateBody(schema, { onFail });

    await middleware(request, reply);

    expect(onFail).toHaveBeenCalledWith(
      request,
      reply,
      expect.stringContaining('title'),
      expect.any(Object)
    );
  });
});
