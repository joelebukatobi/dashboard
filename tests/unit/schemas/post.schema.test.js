import { describe, expect, it } from 'vitest';
import {
  normalizeOptionalId,
  parsePostTagIds,
  preprocessPostBody,
  slugifyPostTitle,
} from '../../../src/lib/post-input.js';
import { postBodySchema } from '../../../src/admin/schemas/post.schema.js';

describe('post-input', () => {
  it('slugifyPostTitle normalizes titles', () => {
    expect(slugifyPostTitle('Hello World!')).toBe('hello-world');
  });

  it('normalizeOptionalId converts empty strings to null', () => {
    expect(normalizeOptionalId('')).toBeNull();
    expect(normalizeOptionalId('abc')).toBe('abc');
  });

  it('parsePostTagIds accepts tags or tagIds', () => {
    expect(parsePostTagIds({ tagIds: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(parsePostTagIds({ tags: 'a,b' })).toEqual(['a', 'b']);
  });

  it('preprocessPostBody generates slug from title', () => {
    expect(preprocessPostBody({
      title: 'My New Post',
      slug: '',
      content: '<p>Hi</p>',
    })).toMatchObject({
      title: 'My New Post',
      slug: 'my-new-post',
      categoryId: undefined,
    });
  });
});

describe('postBodySchema', () => {
  it('accepts create payload without slug when title is present', () => {
    const result = postBodySchema.safeParse({
      title: 'Git SSH Setup',
      slug: '',
      content: '<p>Body</p>',
      categoryId: '',
      featuredImageId: '',
      tagIds: ['11111111-1111-4111-8111-111111111111'],
      status: 'DRAFT',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('git-ssh-setup');
      expect(result.data.categoryId).toBeUndefined();
      expect(result.data.featuredImageId).toBeUndefined();
      expect(result.data.tags).toEqual(['11111111-1111-4111-8111-111111111111']);
    }
  });

  it('rejects payload without title and slug', () => {
    const result = postBodySchema.safeParse({
      title: '',
      slug: '',
      content: '<p>Body</p>',
    });

    expect(result.success).toBe(false);
  });
});
