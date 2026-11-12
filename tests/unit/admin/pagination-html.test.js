import { describe, it, expect } from 'vitest';
import { paginationHtml } from '../../../src/admin/templates/utils/helpers.js';

describe('paginationHtml', () => {
  it('derives the hx-target from the last segment of a flat basePath', () => {
    const html = paginationHtml({ basePath: '/admin/posts', page: 2, totalPages: 3 });
    expect(html).toContain('hx-target="#posts-table-container"');
    expect(html).toContain('hx-get="/admin/posts?page=1"');
    expect(html).toContain('hx-get="/admin/posts?page=3"');
    expect(html).toContain('hx-push-url="true"');
  });

  it('derives the hx-target from the last segment of a nested basePath', () => {
    const html = paginationHtml({ basePath: '/admin/media/albums', page: 1, totalPages: 2 });
    expect(html).toContain('hx-target="#albums-table-container"');
  });

  it('omits hx-get on the disabled prev/next edges', () => {
    const html = paginationHtml({ basePath: '/admin/posts', page: 1, totalPages: 1 });
    // Only one page: both prev and next are disabled, href="#", no hx-get.
    const prevNext = html.match(/<a href="#"[^>]*>/g) || [];
    expect(prevNext.length).toBe(2);
    for (const tag of prevNext) {
      expect(tag).not.toContain('hx-get');
    }
  });

  it('carries filters through into the hx-get url', () => {
    const html = paginationHtml({
      basePath: '/admin/posts',
      page: 1,
      totalPages: 2,
      filters: { status: 'PUBLISHED' },
      filterKeys: ['status'],
    });
    expect(html).toContain('hx-get="/admin/posts?page=2&status=PUBLISHED"');
  });
});
