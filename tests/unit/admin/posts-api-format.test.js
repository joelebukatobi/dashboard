import { describe, it, expect } from 'vitest';
import { formatPostForAPI } from '../../../src/admin/controllers/api/posts.controller.js';

// The public API is the only path the published site's post page goes
// through (blog.controller.js fetches /api/v1/posts/:slug). Content authored
// against a local dev server can carry absolute http://localhost:PORT/...
// URLs into the database, so the API-shaped response must rewrite them the
// same way the admin edit preview already does.
describe('formatPostForAPI', () => {
  it('rewrites localhost media URLs embedded in the post body', () => {
    const post = {
      id: 1,
      title: 'Hello',
      slug: 'hello',
      excerpt: 'An excerpt with a http://localhost:3000/uploads/keep.png mention',
      content: '<p>Look</p><img src="http://localhost:3000/uploads/photo.png">',
      createdAt: null,
      updatedAt: null,
    };

    const formatted = formatPostForAPI(post);

    expect(formatted.post).toBe('<p>Look</p><img src="/public/uploads/photo.png">');
  });

  it('leaves the excerpt untouched', () => {
    const post = {
      id: 1,
      title: 'Hello',
      slug: 'hello',
      excerpt: 'An excerpt with a http://localhost:3000/uploads/keep.png mention',
      content: '<p>No media here</p>',
      createdAt: null,
      updatedAt: null,
    };

    const formatted = formatPostForAPI(post);

    expect(formatted.description).toBe(post.excerpt);
  });
});
