function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderComments(comments = []) {
  if (!comments.length) {
    return `<p class="blog-post-comments__empty">No comments yet. Be the first to respond.</p>`;
  }

  const renderNode = (comment) => {
    const replies = comment.replies?.length
      ? `<div class="blog-post-comments__replies">${comment.replies.map(renderNode).join('')}</div>`
      : '';

    return `
      <article class="blog-comment">
        <p class="blog-comment__meta">${escapeHtml(comment.authorName || 'Anonymous')} · ${escapeHtml(formatDate(comment.createdAt))}</p>
        <p class="blog-comment__content">${escapeHtml(comment.content || '')}</p>
        ${replies}
      </article>
    `;
  };

  return comments.map(renderNode).join('');
}

export function blogPostMeta({ post }) {
  return {
    title: `${escapeHtml(post.title)} - Blog`,
    layout: 'blog',
    activeBlogNav: false,
  };
}

export function blogPostContent({ post, comments = [] }) {
  const author = `${post?.user?.first_name || ''} ${post?.user?.last_name || ''}`.trim() || 'Admin';
  const category = post?.category?.name || 'General';
  const image = post?.image || '/public/uploads/images/featured-posts.jpg';

  return `
    <article class="blog-post-detail">
      <img class="blog-post-detail__image" src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" />
      <p class="blog-post-detail__meta">${escapeHtml(formatDate(post.created_at))} · ${escapeHtml(category)} · ${escapeHtml(author)}</p>
      <h1 class="blog-post-detail__title">${escapeHtml(post.title)}</h1>
      <div class="blog-post-detail__content">${post.post || ''}</div>

      <section class="blog-post-comments">
        <h2 class="blog-post-comments__title">Comments</h2>
        <div class="blog-post-comments__list">
          ${renderComments(comments)}
        </div>
      </section>
    </article>

    <aside class="blog-sidebar">
      <div class="blog-widget">
        <h3 class="blog-widget__title">About this post</h3>
        <p class="blog-widget__text">Published in ${escapeHtml(category)} with ${comments.length} comment${comments.length === 1 ? '' : 's'}.</p>
      </div>
      <div class="blog-widget">
        <h3 class="blog-widget__title">Back to Blog</h3>
        <p class="blog-widget__text"><a class="blog-post-card__readmore" href="/blog">View all posts</a></p>
      </div>
    </aside>
  `;
}

export function blogPostNotFoundMeta() {
  return {
    title: 'Post not found',
    layout: 'app',
  };
}

export function blogPostNotFoundContent() {
  return '<h1>Post not found</h1>';
}
