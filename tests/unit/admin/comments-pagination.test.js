import { describe, it, expect } from 'vitest';
import { commentsListFragment, postCommentsContent } from '../../../src/admin/templates/pages/posts/comments.js';

const fakeComment = {
  id: 'c1',
  postId: 'abc-123',
  authorName: 'Jane',
  authorEmail: '',
  content: 'hello',
  createdAt: new Date().toISOString(),
  isEdited: false,
  replies: [],
};

const pagination = { page: 2, totalPages: 3, total: 25 };

describe('comments pagination', () => {
  it('wires pagination links to swap #comments-list-container via htmx', () => {
    const html = commentsListFragment({
      comments: [fakeComment],
      pagination,
      post: { id: 'abc-123' },
      user: { id: 'u1' },
    });

    expect(html).toContain('hx-get="/admin/posts/abc-123/comments?page=1"');
    expect(html).toContain('hx-get="/admin/posts/abc-123/comments?page=3"');
    expect(html).toContain('hx-target="#comments-list-container"');
    expect(html).toContain('hx-push-url="true"');
  });

  it('full page render carries the matching container id', () => {
    const html = postCommentsContent({
      user: { id: 'u1' },
      post: { id: 'abc-123', title: 'Test Post' },
      comments: [fakeComment],
      pagination,
      toast: null,
    });

    expect(html).toContain('id="comments-list-container"');
  });
});
