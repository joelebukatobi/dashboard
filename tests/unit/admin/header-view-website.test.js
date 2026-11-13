import { describe, it, expect } from 'vitest';
import { header } from '../../../src/admin/templates/partials/header.js';

// "View Website" opens the public site this install serves, never the
// siteUrl setting, whose seeded default is the https://example.com placeholder.
describe('admin header View Website link', () => {
  it('points at the site root', () => {
    const html = header({ user: { firstName: 'Ada', lastName: 'L', email: 'a@b.c', role: 'ADMIN' } });
    const link = html.slice(html.lastIndexOf('<a', html.indexOf('View Website')), html.indexOf('View Website'));
    expect(link).toContain('href="/"');
    expect(html).not.toContain('example.com');
  });
});
