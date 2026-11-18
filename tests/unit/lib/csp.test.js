import { describe, it, expect } from 'vitest';
import { BASE_CSP_DIRECTIVES, mergeCspDirectives, cspDirectives } from '../../../src/lib/csp.js';

describe('CSP directives', () => {
  it('ships no fork sources: dashboard has no src/site/csp.js', async () => {
    expect(await cspDirectives()).toEqual(BASE_CSP_DIRECTIVES);
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
