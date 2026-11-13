import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isRateLimitExemptPath } from '../../../src/lib/rate-limit-allowlist.js';

describe('isRateLimitExemptPath', () => {
  it('exempts static media and build assets', () => {
    expect(isRateLimitExemptPath('/public/uploads/images/a.jpg')).toBe(true);
    expect(isRateLimitExemptPath('/uploads/images/a.jpg?v=1')).toBe(true);
    expect(isRateLimitExemptPath('/dist/css/admin.css')).toBe(true);
    expect(isRateLimitExemptPath('/favicon.ico')).toBe(true);
    expect(isRateLimitExemptPath('/favicon.svg')).toBe(true);
  });

  it('still counts HTML and API routes', () => {
    expect(isRateLimitExemptPath('/admin/media/images?page=2')).toBe(false);
    expect(isRateLimitExemptPath('/api/v1/posts')).toBe(false);
    expect(isRateLimitExemptPath('/health')).toBe(false);
  });
});

describe('production rate limit wiring', () => {
  it('registers allowList via isRateLimitExemptPath', () => {
    const appSource = readFileSync('src/app.js', 'utf8');
    expect(appSource).toMatch(/isRateLimitExemptPath/);
    expect(appSource).toMatch(/allowList:\s*\(request\)\s*=>\s*isRateLimitExemptPath\(request\.url\)/);
  });
});
