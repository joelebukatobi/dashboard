import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const file = path.resolve(import.meta.dirname, '../../../scss/app/base/_base.scss');

describe('public root font-size scale', () => {
  it('sets the same 10px-at-base / 14px-at-1440px root as admin, so shared rem tokens mean what they say', () => {
    const scss = readFileSync(file, 'utf8');

    // Matches the admin root rule (scss/admin/base/_base.scss) so --spacing: 0.4rem
    // (css/theme.css) lands on 4px here too, and so the hand-authored rem values in
    // scss/app/pages/** (written assuming a 10px root) render at their intended size.
    expect(scss).toMatch(/html\s*\{[^}]*text-\[62\.5%\][^}]*\}/s);
    expect(scss).toMatch(/min-width:\s*1440px[\s\S]*?text-\[87\.5%\]/);
  });
});
