import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The middleware needs a database and a Fastify request to run, so this
// asserts the shape of the fix rather than executing it: matching must be
// done against a query-stripped pathname, not the raw url.
const source = readFileSync('src/middleware/setup-check.js', 'utf8');

describe('setup check path matching', () => {
  it('strips the query string before matching', () => {
    expect(source).toMatch(/const pathname = request\.url\.split\('\?'\)\[0\]/);
  });

  it('matches on pathname rather than the raw url', () => {
    const rawUrlMatches = source.match(/request\.url\.startsWith|request\.url ===/g) || [];
    expect(
      rawUrlMatches,
      'every skip check should compare pathname, not request.url',
    ).toEqual([]);
  });
});

describe('pathname derivation', () => {
  const pathnameOf = (url) => url.split('?')[0];

  it('drops an asset version query', () => {
    expect(pathnameOf('/favicon.ico?v=abc123')).toBe('/favicon.ico');
  });

  it('leaves a plain path untouched', () => {
    expect(pathnameOf('/admin/auth/login')).toBe('/admin/auth/login');
  });
});
