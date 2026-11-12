import { describe, it, expect } from 'vitest';
import { blogIndexFooter, blogIndexFragment } from '../../../src/app/templates/pages/blog/index.js';
import { buildBlogShell } from '../../../src/app/templates/layouts/app.js';

describe('blog pagination', () => {
  it('wires Previous/Next to swap #blog-list-container via htmx', () => {
    const html = blogIndexFooter({ page: 2, totalPages: 3 });
    expect(html).toContain('hx-get="/blog?page=1"');
    expect(html).toContain('hx-get="/blog?page=3"');
    expect(html).toContain('hx-target="#blog-list-container"');
    expect(html).toContain('hx-push-url="true"');
  });

  it('omits hx-get on the disabled edge at page 1', () => {
    const html = blogIndexFooter({ page: 1, totalPages: 3 });
    const prevLink = html.match(/<a class="blog-pagination__link[^>]*>Previous<\/a>/)[0];
    expect(prevLink).not.toContain('hx-get');
  });

  it('fragment mirrors the shell markup around content', () => {
    const fragment = blogIndexFragment({ posts: [], page: 1, totalPages: 1 });
    expect(fragment).toContain('<main class="blog-main">');
  });

  it('shell wraps content and footer in the matching container id', () => {
    const html = buildBlogShell({ title: 'Blog', content: 'CONTENT', footer: 'FOOTER' });
    expect(html).toContain('id="blog-list-container"');
    expect(html).toContain('/dist/js/htmx.js');
  });
});
