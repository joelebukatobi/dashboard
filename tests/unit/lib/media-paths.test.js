import { describe, it, expect } from 'vitest';
import {
  isLocalDevMediaUrl,
  mediaItemPublicUrl,
  mediaItemThumbnailUrl,
  rewriteContentMediaUrls,
  toPublicMediaUrl,
} from '../../../src/lib/media-paths.js';

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
  // Changed deliberately: this used to prefer the thumbnail, which meant the
  // public API served thumbnail-sized hero images. Callers wanting a thumbnail
  // now ask for one via mediaItemThumbnailUrl.
  it('prefers the full path over the thumbnail', () => {
    expect(
      mediaItemPublicUrl({
        path: 'public/uploads/posts/full.jpg',
        thumbnailPath: '/public/uploads/posts/thumbs/thumb.jpg',
      }),
    ).toBe('/public/uploads/posts/full.jpg');
  });

  it('returns null for missing item', () => {
    expect(mediaItemPublicUrl(null)).toBe(null);
  });
});

describe('isLocalDevMediaUrl', () => {
  it('recognises localhost with a port', () => {
    expect(isLocalDevMediaUrl('http://localhost:7000/public/uploads/a.jpg')).toBe(true);
  });

  it('recognises loopback addresses', () => {
    expect(isLocalDevMediaUrl('http://127.0.0.1/public/uploads/a.jpg')).toBe(true);
    expect(isLocalDevMediaUrl('https://0.0.0.0:3000/public/uploads/a.jpg')).toBe(true);
  });

  it('rejects a genuine external url', () => {
    expect(isLocalDevMediaUrl('https://images.unsplash.com/photo-1.jpg')).toBe(false);
  });

  it('rejects a hostname that merely starts with localhost', () => {
    expect(isLocalDevMediaUrl('https://localhost.example.com/a.jpg')).toBe(false);
  });

  it('rejects empty and non-string input', () => {
    expect(isLocalDevMediaUrl('')).toBe(false);
    expect(isLocalDevMediaUrl(null)).toBe(false);
    expect(isLocalDevMediaUrl(42)).toBe(false);
  });
});

describe('toPublicMediaUrl with localhost urls', () => {
  it('rewrites a localhost url to its public path', () => {
    expect(toPublicMediaUrl('http://localhost:7000/public/uploads/posts/p.jpg'))
      .toBe('/public/uploads/posts/p.jpg');
  });

  it('still passes a genuine external url through unchanged', () => {
    expect(toPublicMediaUrl('https://images.unsplash.com/photo-1.jpg'))
      .toBe('https://images.unsplash.com/photo-1.jpg');
  });
});

describe('rewriteContentMediaUrls', () => {
  it('rewrites an <img> localhost src to its public path', () => {
    const html = '<img src="http://localhost:7000/public/uploads/a.jpg">';
    expect(rewriteContentMediaUrls(html)).toBe(
      '<img src="/public/uploads/a.jpg">',
    );
  });

  it('rewrites <video> and <source> localhost src attributes', () => {
    const html =
      '<video src="http://localhost:7000/public/uploads/v.mp4"></video>' +
      '<source src="http://127.0.0.1:7000/public/uploads/s.mp4">';
    expect(rewriteContentMediaUrls(html)).toBe(
      '<video src="/public/uploads/v.mp4"></video><source src="/public/uploads/s.mp4">',
    );
  });

  it('leaves external URLs untouched', () => {
    const html = '<img src="https://images.unsplash.com/photo-1.jpg">';
    expect(rewriteContentMediaUrls(html)).toBe(html);
  });

  it('returns empty string for null/empty input', () => {
    expect(rewriteContentMediaUrls(null)).toBe('');
    expect(rewriteContentMediaUrls('')).toBe('');
  });
});

// One helper serving two intents meant the public API returned thumbnail-sized
// hero images. These two exist so the caller states which it wants.
describe('mediaItemPublicUrl vs mediaItemThumbnailUrl', () => {
  const item = {
    path: '/public/uploads/posts/full.jpg',
    thumbnailPath: '/public/uploads/posts/thumb.jpg',
  };

  it('mediaItemPublicUrl prefers the full image', () => {
    expect(mediaItemPublicUrl(item)).toBe('/public/uploads/posts/full.jpg');
  });

  it('mediaItemThumbnailUrl prefers the thumbnail', () => {
    expect(mediaItemThumbnailUrl(item)).toBe('/public/uploads/posts/thumb.jpg');
  });

  it('each falls back to the other when its preferred path is missing', () => {
    expect(mediaItemPublicUrl({ thumbnailPath: '/public/uploads/t.jpg' }))
      .toBe('/public/uploads/t.jpg');
    expect(mediaItemThumbnailUrl({ path: '/public/uploads/f.jpg' }))
      .toBe('/public/uploads/f.jpg');
  });

  it('both return null for a missing item', () => {
    expect(mediaItemPublicUrl(null)).toBeNull();
    expect(mediaItemThumbnailUrl(undefined)).toBeNull();
  });
});
