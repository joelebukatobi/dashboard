import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const categoriesScss = readFileSync(
  path.resolve(import.meta.dirname, '../../../scss/admin/pages/_categories.scss'),
  'utf8',
);
const tagsScss = readFileSync(
  path.resolve(import.meta.dirname, '../../../scss/admin/pages/_tags.scss'),
  'utf8',
);

describe('categories/tags table styling targets columns by class, not position', () => {
  it('_categories.scss styles the slug by .table__slug, not nth-child(2)', () => {
    expect(categoriesScss).not.toMatch(/nth-child/);
    expect(categoriesScss).toMatch(/\.table__slug\s*\{/);
  });

  it('_tags.scss styles the slug and description by class, not nth-child', () => {
    expect(tagsScss).not.toMatch(/nth-child/);
    expect(tagsScss).toMatch(/\.table__slug\s*\{/);
    expect(tagsScss).toMatch(/\.table__description\s*\{/);
  });
});
