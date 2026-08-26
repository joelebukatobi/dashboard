import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The CSP and the templates have to agree. They drifted apart once already:
// the templates use inline event handler attributes, while Helmet defaults
// script-src-attr to 'none'. The result was invisible — pages rendered, the
// server was healthy, and every onclick silently did nothing in production
// while working fine in development.

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const INLINE_HANDLER = /\son[a-z]+=["']/;

const templatesWithInlineHandlers = () =>
  walk('src').filter((f) => f.includes('/templates/') && INLINE_HANDLER.test(readFileSync(f, 'utf8')));

const cspConfig = readFileSync('src/app.js', 'utf8');

describe('content security policy', () => {
  it('allows inline event handlers while any template still uses them', () => {
    const offenders = templatesWithInlineHandlers();
    if (offenders.length === 0) return; // handlers all converted — directive no longer needed

    expect(
      cspConfig,
      `${offenders.length} template(s) use inline handlers (e.g. ${offenders[0]}), ` +
        "so the CSP must set scriptSrcAttr: [\"'unsafe-inline'\"]",
    ).toMatch(/scriptSrcAttr:\s*\["'unsafe-inline'"\]/);
  });

  it('still restricts script sources to self', () => {
    expect(cspConfig).toMatch(/scriptSrc:\s*\["'self'"/);
  });
});
