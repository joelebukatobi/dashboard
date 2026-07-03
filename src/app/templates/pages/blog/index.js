function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(text = '', max = 180) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

import { formatSiteDate } from '../../../../lib/site-dates.js';
import { getRequestSettings } from '../../../../lib/settings-context.js';

function formatDate(isoString) {
  return formatSiteDate(isoString, getRequestSettings());
}

export function blogIndexMeta({ page = 1, totalPages = 1 }) {
  return {
    title: 'Blog',
    layout: 'blog',
    activeBlogNav: true,
    footer: blogIndexFooter({ page, totalPages }),
  };
}

export function blogIndexFooter({ page = 1, totalPages = 1 }) {
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return `
    <footer class="blog-pagination">
      <a class="blog-pagination__link ${page <= 1 ? 'blog-pagination__link--disabled' : ''}" href="/blog?page=${prevPage}">Previous</a>
      <span class="blog-pagination__current">Page ${page}</span>
      <a class="blog-pagination__link ${page >= totalPages ? 'blog-pagination__link--disabled' : ''}" href="/blog?page=${nextPage}">Next</a>
    </footer>
  `;
}

export function blogIndexContent({ posts = [], page = 1, totalPages = 1 }) {
  const cardsHtml = posts.length
    ? posts
      .map((post) => {
        const author = `${post?.user?.first_name || ''} ${post?.user?.last_name || ''}`.trim() || 'Admin';
        const category = post?.category?.name || 'General';
        const image = post?.image || '/public/uploads/images/featured-posts.jpg';
        const postUrl = `/blog/${post.slug}`;
        return `
          <article class="blog-post-card">
            <a class="blog-post-card__image-link" href="${escapeHtml(postUrl)}" aria-label="Read ${escapeHtml(post.title)}">
              <img class="blog-post-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" loading="lazy" />
            </a>
            <div class="blog-post-card__content">
              <p class="blog-post-card__meta">${escapeHtml(formatDate(post.created_at))} · ${escapeHtml(category)} · ${escapeHtml(author)}</p>
              <h2 class="blog-post-card__title">${escapeHtml(post.title)}</h2>
              <p class="blog-post-card__excerpt">${escapeHtml(truncate(post.description || ''))}</p>
              <a class="blog-post-card__readmore" href="${escapeHtml(postUrl)}">Continue reading</a>
            </div>
          </article>
        `;
      })
      .join('')
    : `
      <div class="blog-empty-state">
        <h2 class="blog-empty-state__title">No posts yet</h2>
        <p class="blog-empty-state__text">Content will appear here once published from admin.</p>
      </div>
    `;

  return `
    <section class="blog-content">
      ${cardsHtml}
    </section>

    <aside class="blog-sidebar">
      <div class="blog-widget">
        <h3 class="blog-widget__title">About</h3>
        <p class="blog-widget__text">A clean blog layout powered by your internal API.</p>
      </div>
      <div class="blog-widget">
        <h3 class="blog-widget__title">Archive</h3>
        <p class="blog-widget__text">Page ${page} of ${totalPages}</p>
      </div>
    </aside>
  `;
}
