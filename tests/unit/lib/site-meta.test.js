import { describe, it, expect } from 'vitest';
import { resolvePageMeta, renderOgMetaTags } from '../../../src/lib/site-meta.js';

describe('resolvePageMeta', () => {
  const site = {
    siteName: 'My Blog',
    siteTagline: 'Ideas and stories',
    siteUrl: 'https://example.com',
    siteIcon: '/public/uploads/icon.png',
  };

  it('uses site defaults when page meta is empty', () => {
    const meta = resolvePageMeta(site, {});
    expect(meta.title).toBe('My Blog');
    expect(meta.description).toBe('Ideas and stories');
    expect(meta.ogImage).toBe('/public/uploads/icon.png');
  });

  it('page overrides win over site defaults', () => {
    const meta = resolvePageMeta(site, {
      title: 'Post Title',
      description: 'Post excerpt',
      path: '/blog/my-post',
    });
    expect(meta.title).toBe('Post Title');
    expect(meta.ogDescription).toBe('Post excerpt');
    expect(meta.ogUrl).toBe('https://example.com/blog/my-post');
  });

  it('falls back to favicon when no site icon', () => {
    const meta = resolvePageMeta({ siteName: 'X' }, {});
    expect(meta.ogImage).toBe('/favicon.svg');
  });
});

describe('renderOgMetaTags', () => {
  it('renders og and twitter tags', () => {
    const html = renderOgMetaTags({
      ogTitle: 'Title',
      ogDescription: 'Desc',
      ogSiteName: 'Site',
      ogUrl: 'https://example.com',
      ogImage: '/icon.png',
    });
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('content="https://example.com"');
  });
});
