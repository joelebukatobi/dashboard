import { describe, it, expect } from 'vitest';
import { toPublicMediaUrl, mediaItemPublicUrl } from '../../../src/lib/media-paths.js';

describe('toPublicMediaUrl', () => {
  it('normalizes legacy public/ paths without leading slash', () => {
    expect(toPublicMediaUrl('public/uploads/posts/post-123.jpg')).toBe(
      '/public/uploads/posts/post-123.jpg',
    );
  });

  it('passes through /public/ paths', () => {
    expect(toPublicMediaUrl('/public/uploads/images/foo.jpg')).toBe(
      '/public/uploads/images/foo.jpg',
    );
  });

  it('normalizes uploads/ paths', () => {
    expect(toPublicMediaUrl('uploads/images/foo.jpg')).toBe('/public/uploads/images/foo.jpg');
  });

  it('returns empty string for falsy input', () => {
    expect(toPublicMediaUrl(null)).toBe('');
    expect(toPublicMediaUrl('')).toBe('');
  });

  it('passes through absolute http URLs', () => {
    expect(toPublicMediaUrl('https://cdn.example.com/img.jpg')).toBe(
      'https://cdn.example.com/img.jpg',
    );
  });
});

describe('mediaItemPublicUrl', () => {
  it('prefers thumbnail over full path', () => {
    expect(
      mediaItemPublicUrl({
        path: 'public/uploads/posts/full.jpg',
        thumbnailPath: '/public/uploads/posts/thumbs/thumb.jpg',
      }),
    ).toBe('/public/uploads/posts/thumbs/thumb.jpg');
  });

  it('returns null for missing item', () => {
    expect(mediaItemPublicUrl(null)).toBe(null);
  });
});
