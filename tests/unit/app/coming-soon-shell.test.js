import { describe, it, expect } from 'vitest';
import { buildComingSoonShell } from '../../../src/app/templates/layouts/app.js';

// The CSP only allows scripts from this site, so the coming-soon page must
// load its icon library locally or the icon never renders.
describe('coming soon shell', () => {
  it('loads lucide from /dist, not a CDN', () => {
    const html = buildComingSoonShell({ content: '<i data-lucide="construction"></i>' });
    expect(html).toContain('<script src="/dist/js/lucide.js"></script>');
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\//);
  });
});
