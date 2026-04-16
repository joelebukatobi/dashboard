// src/admin/templates/pages/posts/list.js
// Posts List Page - Exact structure from posts.html

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';

const listToolbarClass = 'mb-[1.6rem] flex shrink-0 flex-col gap-[1.6rem] sm:flex-row sm:items-center';
const listToolbarSearchClass = 'relative min-w-0 flex-1';
const listToolbarSearchIconClass = 'pointer-events-none absolute left-[1rem] top-1/2 h-[1.6rem] w-[1.6rem] -translate-y-1/2 text-grey-400 dark:text-grey-500';
const listToolbarInputClass = 'h-[3.2rem] w-full rounded-md border border-grey-100/50 bg-white px-[1.2rem] pl-[4.4rem] text-body-sm text-grey-900 outline-none transition-all duration-200 placeholder:text-body-sm placeholder:text-grey-400 hover:border-grey-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-grey-700 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-500 dark:hover:border-grey-600';
const listToolbarControlsClass = 'flex flex-wrap items-center gap-[1.2rem]';
const listToolbarDropdownClass = 'relative';
const listToolbarDropdownTriggerClass = 'inline-flex h-[3.2rem] items-center gap-[0.6rem] rounded-md border border-grey-200 bg-white px-[1.2rem] text-[1.3rem] font-medium text-grey-700 transition-all duration-200 hover:border-blue-600/30 hover:bg-blue-600/10 hover:text-blue-700 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-300 dark:hover:border-grey-600 dark:hover:bg-grey-800 dark:hover:text-grey-200';
const listToolbarButtonClass = 'inline-flex h-[3.2rem] items-center justify-center gap-[0.8rem] rounded-md bg-blue-600 px-[1.2rem] text-body-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:text-white focus:ring-[.08rem] focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-grey-900 dark:hover:bg-grey-100';
const listToolbarButtonIconClass = 'hidden h-[1.4rem] w-[1.4rem] sm:inline-block';
const rowActionIconClass = 'h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]';
const rowActionTextClass = 'lg:hidden';

/**
 * Posts List Page Template
 * Display all posts with filters and pagination
 * Structure matches posts.html exactly
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
        <div class="${listToolbarClass}">
          <div class="${listToolbarSearchClass}">
            <i data-lucide="search" class="${listToolbarSearchIconClass}"></i>
            <input
              type="text"
              class="${listToolbarInputClass}"
              placeholder="Search posts..."
              value="${filters.search || ''}"
              hx-get="/admin/posts"
              hx-target=".posts__table-content"
              hx-trigger="keyup changed delay:500ms"
              name="search"
            />
          </div>

          <div class="${listToolbarControlsClass}">
            <!-- Status Filter -->
            <div class="hs-dropdown ${listToolbarDropdownClass}">
              <button
                id="hs-dropdown-status"
                type="button"
                class="hs-dropdown-toggle ${listToolbarDropdownTriggerClass}"
              >
                <span>${filters.status || 'Status'}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="hs-dropdown-menu dropdown__menu dropdown__menu--sm" aria-labelledby="hs-dropdown-status">
                <a href="/admin/posts" class="dropdown__item ${!filters.status ? 'dropdown__item--active' : ''}">All Statuses</a>
                <a href="/admin/posts?status=PUBLISHED" class="dropdown__item ${filters.status === 'PUBLISHED' ? 'dropdown__item--active' : ''}">Published</a>
                <a href="/admin/posts?status=DRAFT" class="dropdown__item ${filters.status === 'DRAFT' ? 'dropdown__item--active' : ''}">Draft</a>
                <a href="/admin/posts?status=SCHEDULED" class="dropdown__item ${filters.status === 'SCHEDULED' ? 'dropdown__item--active' : ''}">Scheduled</a>
                <a href="/admin/posts?status=ARCHIVED" class="dropdown__item ${filters.status === 'ARCHIVED' ? 'dropdown__item--active' : ''}">Archived</a>
              </div>
            </div>

            <!-- Category Filter -->
            <div class="hs-dropdown ${listToolbarDropdownClass}">
              <button
                id="hs-dropdown-category"
                type="button"
                class="hs-dropdown-toggle ${listToolbarDropdownTriggerClass}"
              >
                <span>${filters.categoryId ? categories.find((c) => c.id === filters.categoryId)?.title : 'Category'}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="hs-dropdown-menu dropdown__menu dropdown__menu--sm" aria-labelledby="hs-dropdown-category">
                <a href="/admin/posts" class="dropdown__item ${!filters.categoryId ? 'dropdown__item--active' : ''}">All Categories</a>
                ${categories
                  .map(
                    (cat) => `
                  <a href="/admin/posts?category=${cat.id}" class="dropdown__item ${filters.categoryId === cat.id ? 'dropdown__item--active' : ''}">${cat.title}</a>
                `,
                  )
                  .join('')}
              </div>
            </div>

            <!-- Sort -->
            <button class="${listToolbarButtonClass}">
              <i data-lucide="arrow-up-down" class="${listToolbarButtonIconClass}"></i>
              <span>Sort</span>
            </button>

            <!-- Add New -->
            <a href="/admin/posts/new" class="${listToolbarButtonClass}">
              <span>${posts.length === 0 ? 'Create First Post' : 'New Post'}</span>
            </a>
          </div>
        </div>

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
                     ${post.category ? `<span class="text-grey-700">${post.category.title}</span>` : '<span class="text-grey-500">Uncategorized</span>'}
                   </td>
                    <td class="table__td">
                      <span class="table__label">Status</span>
                      ${getStatusBadge(post.status)}
                    </td>
                   <td class="table__td">
                     <span class="table__label">Comments</span>
                     <a href="/admin/posts/${post.id}/comments" class="table__comments-link">
                       <i data-lucide="message-circle" class="w-4 h-4"></i>
                       <span>${post.commentsCount || 0}</span>
                     </a>
                   </td>
                   <td class="table__td">
                     <span class="table__label">Date</span>
                     ${formatDate(post.publishedAt || post.createdAt)}
                   </td>
                  <td class="table__td table__td--actions">
                    <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
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
                    </div>
                  </td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>

          ${posts.length > 0 && totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
        `
        }
        </div>
      </div>
    </div>

  `;

  // Create delete modal using reusable component
  const deleteModal = new DeleteModal({
    entityName: 'Post',
    entityLabel: 'title',
    deleteUrlPath: '/admin/posts',
    targetSelector: '.table',
    swapMode: 'innerHTML',
    title: 'Are you sure?',
    csrfToken: user?.csrfToken
  });

  return mainLayout({
    title: 'Blog Posts',
    description: 'Manage your blog posts',
    content: content + deleteModal.render() + toastScript,
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

  const config = statusConfig[status] || statusConfig['DRAFT'];

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

function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  // Generate page numbers
  let pageNumbers = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (page <= 3) {
      pageNumbers = [1, 2, 3, 4, '...', totalPages];
    } else if (page >= totalPages - 2) {
      pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pageNumbers = [1, '...', page - 1, page, page + 1, '...', totalPages];
    }
  }

  return `
    <!-- Sticky Footer Pagination -->
    <footer class="page-footer">
      <div class="pagination">
        ${generatePaginationLinks(page, totalPages, queryPrefix)}
      </div>
    </footer>
  `;
}

function generatePaginationLinks(page, totalPages, queryPrefix) {
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

  return links;
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
