import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { BASE_CSP_DIRECTIVES, mergeCspDirectives, cspDirectives } from '../../../src/lib/csp.js';

describe('CSP directives', () => {
  // Only true in dashboard itself: a fork that adds src/site/csp.js gets more.
  const forkHasCsp = existsSync(new URL('../../../src/site/csp.js', import.meta.url));
  it.skipIf(forkHasCsp)('ships no fork sources: dashboard has no src/site/csp.js', async () => {
    expect(await cspDirectives()).toEqual(BASE_CSP_DIRECTIVES);
  });

  it("always contains dashboard's own sources", async () => {
    const d = await cspDirectives();
    for (const [key, sources] of Object.entries(BASE_CSP_DIRECTIVES)) {
      expect(d[key]).toEqual(expect.arrayContaining(sources));
    }
  });

  it('adds a fork directive on top of default-src', () => {
    const out = mergeCspDirectives(BASE_CSP_DIRECTIVES, { frameSrc: ['https://maps.google.com'] });
    expect(out.frameSrc).toEqual(["'self'", 'https://maps.google.com']);
  });

  it('extends an existing directive without dropping or repeating sources', () => {
    const out = mergeCspDirectives(BASE_CSP_DIRECTIVES, { imgSrc: ['https://cdn.example', "'self'"] });
    expect(out.imgSrc).toEqual([...BASE_CSP_DIRECTIVES.imgSrc, 'https://cdn.example']);
    expect(out.scriptSrc).toEqual(BASE_CSP_DIRECTIVES.scriptSrc);
  });

  it('ignores entries that are not lists', () => {
    expect(mergeCspDirectives(BASE_CSP_DIRECTIVES, { frameSrc: 'https://x' })).toEqual(BASE_CSP_DIRECTIVES);
  });
});
