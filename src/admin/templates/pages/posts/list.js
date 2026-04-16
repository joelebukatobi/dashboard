// src/admin/templates/pages/posts/list.js
// Posts List Page - Refactored with list-toolbar partial

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';

const rowActionIconClass = 'h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]';
const rowActionTextClass = 'lg:hidden';

/**
 * Posts List Page Template
 * Display all posts with filters and pagination
 */
export function postsListPage({ posts, total, page, totalPages, categories, filters, user, toast }) {
  // Build toast script if toast param is present
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          deleted: 'Post deleted successfully!',
        };
        const message = toastMessages['${toast}'] || '${toast}';
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        // Clean up URL (remove toast param)
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  ` : '';

  // Build filters array for toolbar
  const toolbarFilters = [
    {
      label: filters.status || 'Status',
      options: [
        { url: '/admin/posts', label: 'All Statuses', active: !filters.status },
        { url: '/admin/posts?status=PUBLISHED', label: 'Published', active: filters.status === 'PUBLISHED' },
        { url: '/admin/posts?status=DRAFT', label: 'Draft', active: filters.status === 'DRAFT' },
        { url: '/admin/posts?status=SCHEDULED', label: 'Scheduled', active: filters.status === 'SCHEDULED' },
        { url: '/admin/posts?status=ARCHIVED', label: 'Archived', active: filters.status === 'ARCHIVED' },
      ],
    },
    {
      label: filters.categoryId ? categories.find((c) => c.id === filters.categoryId)?.title : 'Category',
      options: [
        { url: '/admin/posts', label: 'All Categories', active: !filters.categoryId },
        ...categories.map((cat) => ({
          url: `/admin/posts?category=${cat.id}`,
          label: cat.title,
          active: filters.categoryId === cat.id,
        })),
      ],
    },
  ];

  const content = `
    <div class="posts">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Blog Posts</h1>
            <p class="page-header__subtitle">Manage your blog posts</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchPlaceholder: 'Search posts...',
          searchValue: filters.search || '',
          filters: toolbarFilters,
          hasAddButton: true,
          addButtonUrl: '/admin/posts/new',
          addButtonText: posts.length === 0 ? 'Create First Post' : 'New Post',
        })}

        <div class="posts__table-content">
        ${
          posts.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
             <thead class="table__thead">
               <tr>
                 <th>Title</th>
                 <th>Category</th>
                 <th>Status</th>
                 <th>Comments</th>
                 <th>Date</th>
                 <th>Actions</th>
               </tr>
             </thead>
            <tbody class="table__tbody">
              ${posts
                .map(
                  (post) => `
                <tr class="table__tr">
                  <td class="table__td">
                    <span class="table__label">Title</span>
                    <div class="table__title">
                      <a href="/admin/posts/${post.id}/edit">${escapeHtml(post.title)}</a>
                    </div>
                  </td>
                   <td class="table__td">
                     <span class="table__label">Category</span>
                     ${post.category ? `<span>${post.category.title}</span>` : '<span>Uncategorized</span>'}
                   </td>
                    <td class="table__td">
                      <span class="table__label">Status</span>
                      ${getStatusBadge(post.status)}
                    </td>
                   <td class="table__td">
                     <span class="table__label">Comments</span>
                     <a href="/admin/posts/${post.id}/comments" class="table__comments-link">
                       <i data-lucide="message-circle"></i>
                       <span>${post.commentsCount || 0}</span>
                     </a>
                   </td>
                   <td class="table__td">
                     <span class="table__label">Date</span>
                     ${formatDate(post.publishedAt || post.createdAt)}
                   </td>
                  <td class="table__td table__td--actions">
                    <a href="/admin/posts/${post.id}/edit" class="btn btn--ghost row-action row-action--edit">
                      <i data-lucide="pencil" class="${rowActionIconClass}"></i>
                      <span class="${rowActionTextClass}">Edit</span>
                    </a>
                    <button
                      type="button"
                      class="btn btn--ghost row-action row-action--delete"
                      data-post-id="${post.id}"
                      data-post-title="${escapeHtml(post.title)}"
                      onclick="openDeleteModal(this)"
                    >
                      <i data-lucide="trash-2" class="${rowActionIconClass}"></i>
                      <span class="${rowActionTextClass}">Delete</span>
                    </button>
                  </td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `}
        </div>

        ${pagination && pagination.totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  // Initialize delete modal
  const deleteModal = new DeleteModal({
    entityName: 'Post',
    entityLabel: 'title',
    deleteUrlPath: '/admin/posts',
    targetSelector: '.posts__table-content',
    csrfToken: user?.csrfToken || '',
  });

  return mainLayout({
    title: 'Blog Posts',
    description: 'Manage your blog posts',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/posts',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Blog Posts', url: '/admin/posts' },
    ],
  });
}

// Helper Functions

function emptyState() {
  return `
    <div class="empty">
      <h3>No posts yet</h3>
      <p>Create your first post to start sharing your stories</p>
    </div>
  `;
}

function getStatusBadge(status) {
  const statusConfig = {
    PUBLISHED: { class: 'badge--success', label: 'Published' },
    DRAFT: { class: 'badge--warning', label: 'Draft' },
    SCHEDULED: { class: 'badge--info', label: 'Scheduled' },
    ARCHIVED: { class: 'badge--neutral', label: 'Archived' },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  return `<span class="badge ${config.class}">${config.label}</span>`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.categoryId) params.set('category', filters.categoryId);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/posts?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

  // Page numbers
  let pageNumbers = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (page <= 3) {
    pageNumbers = [1, 2, 3, 4, '...', totalPages];
  } else if (page >= totalPages - 2) {
    pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pageNumbers = [1, '...', page - 1, page, page + 1, '...', totalPages];
  }

  pageNumbers.forEach((p) => {
    if (p === '...') {
      links += '<span class="pagination__ellipsis">...</span>';
    } else {
      const active = p === page ? 'pagination__item--active' : '';
      links += `<a href="/admin/posts?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/posts?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}
