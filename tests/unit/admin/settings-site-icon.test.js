import { describe, it, expect } from 'vitest';
import { settingsContent } from '../../../src/admin/templates/pages/settings/settings.js';

// siteIcon and the uploaded file can drift apart — uploads are not in git, so
// a restored database references files it does not have. A broken preview is
// worse on this screen than anywhere else, because this is where you would go
// to fix it.
const render = (siteIcon) =>
  settingsContent({
    user: { role: 'ADMIN', id: 'user-1' },
    settings: {
      GENERAL: [
        { key: 'siteIcon', parsedValue: siteIcon },
        { key: 'siteName', parsedValue: 'Test Site' },
      ],
    },
    toast: null,
  });

describe('settings site icon preview', () => {
  it('renders a hidden fallback alongside a configured icon', () => {
    const html = render('/public/uploads/site/icon.svg');

    expect(html).toContain('site-icon-field__preview-img');
    expect(html, 'a missing file must swap to the fallback rather than showing a broken image')
      .toMatch(/onerror="[^"]*nextElementSibling\.hidden = false/);
    expect(html).toContain('site-icon-field__preview-icon');
  });

  it('renders only the lucide icon when no site icon is configured', () => {
    const html = render('');

    expect(html).not.toContain('site-icon-field__preview-img');
    expect(html).toContain('site-icon-field__preview-icon');
  });

  it('escapes a hostile site icon value', () => {
    const html = render('"><script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
