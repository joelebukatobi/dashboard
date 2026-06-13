import { describe, it, expect } from 'vitest';
import { createCategorySchema } from '../../../src/admin/schemas/category.schema.js';

describe('createCategorySchema', () => {
  it('accepts valid input', () => {
    const result = createCategorySchema.safeParse({
      title: 'News',
      slug: 'news',
      description: 'Updates',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createCategorySchema.safeParse({ title: '   ' });
    expect(result.success).toBe(false);
  });

  it('trims title', () => {
    const result = createCategorySchema.safeParse({ title: '  News  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('News');
    }
  });
});
