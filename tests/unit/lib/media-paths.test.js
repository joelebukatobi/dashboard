import { describe, it, expect } from 'vitest';
import {
  toPublicMediaUrl,
  mediaItemPublicUrl,
  isLocalDevMediaUrl,
  rewriteContentMediaUrls,
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
