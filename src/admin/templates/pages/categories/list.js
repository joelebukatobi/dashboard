// src/admin/templates/pages/categories/list.js
// Categories List Page - Exact structure from categories.html

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';

const listToolbarClass = 'mb-[1.6rem] flex shrink-0 flex-row items-center gap-[1.6rem]';
const listToolbarSearchClass = 'relative min-w-0 flex-1';
const listToolbarSearchIconClass = 'pointer-events-none absolute left-[1rem] top-1/2 h-[1.6rem] w-[1.6rem] -translate-y-1/2 text-grey-400 dark:text-grey-500';
const listToolbarInputClass = 'h-[3.2rem] w-full rounded-md border border-grey-100/50 bg-white px-[1.2rem] pl-[4.4rem] text-body-sm text-grey-900 outline-none transition-all duration-200 placeholder:text-body-sm placeholder:text-grey-400 hover:border-grey-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-grey-700 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-500 dark:hover:border-grey-600';
const listToolbarControlsClass = 'flex shrink-0 items-center gap-[1.2rem]';
const listToolbarButtonClass = 'inline-flex h-[3.2rem] items-center justify-center gap-[0.8rem] rounded-md bg-blue-600 px-[1.2rem] text-body-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:text-white focus:ring-[.08rem] focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-grey-900 dark:hover:bg-grey-100';
const rowActionIconClass = 'h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]';
const rowActionTextClass = 'lg:hidden';

/**
 * Categories List Page Template
 * Display all categories with filters and pagination
 * Structure matches categories.html exactly
 */
export function categoriesListPage({ categories, total, page, totalPages, filters, user, toast }) {
  // Build toast script if toast param is present
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          deleted: 'Category deleted successfully!',
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

  // Initialize delete modal with conditional message config
  const deleteModal = new DeleteModal({
    entityName: 'Category',
    entityLabel: 'title',
    deleteUrlPath: '/admin/categories',
    csrfToken: user?.csrfToken || '',
    hasConditionalMessage: true,
    conditionalConfig: {
      messageWithItems: 'The {name} category has {count} post(s). They will be moved to Uncategorized.',
      messageWithoutItems: 'This action cannot be undone. The {name} category will be permanently deleted.',
      countAttribute: 'data-post-count'
    }
  });

  const content = `
    <div class="categories">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Categories</h1>
            <p class="page-header__subtitle">Manage your categories</p>
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
              placeholder="Search categories..."
              value="${filters.search || ''}"
              hx-get="/admin/categories"
              hx-target=".categories__table-content"
              hx-trigger="keyup changed delay:500ms"
              name="search"
            />
          </div>

          <div class="${listToolbarControlsClass}">
            <!-- Add New -->
            <a href="/admin/categories/new" class="${listToolbarButtonClass}">
              <span>${categories.length === 0 ? 'Create First Category' : 'New Category'}</span>
            </a>
          </div>
        </div>

        <div class="categories__table-content">
        ${
          categories.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
              <thead class="table__thead">
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody">
                ${categories
                  .map(
                    (category) => `
                  <tr class="table__tr">
                    <td class="table__td">
                      <span class="table__label">Title</span>
                      <div class="table__title">
                        <a href="/admin/categories/${category.id}/edit">${escapeHtml(category.title)}</a>
                      </div>
                    </td>

                    <td class="table__td">
                      <span class="table__label">Slug</span>
                      <div class="table__slug">${category.slug}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Desc</span>
                      <div class="table__title">${escapeHtml(category.description) || '-'}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Date</span>
                      ${formatDate(category.updatedAt || category.createdAt)}
                    </td>
                    <td class="table__td table__td--actions">
                      <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
                        <a href="/admin/categories/${category.id}/edit" class="btn btn--ghost row-action row-action--edit">
                          <i data-lucide="pencil" class="${rowActionIconClass}"></i>
                          <span class="${rowActionTextClass}">Edit</span>
                        </a>
                        <button
                          type="button"
                          class="btn btn--ghost row-action row-action--delete"
                          data-category-id="${category.id}"
                          data-category-title="${escapeHtml(category.title)}"
                          data-post-count="${category.postCount || 0}"
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

          ${totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
        `
        }
        </div>
      </div>
    </div>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Categories',
    description: 'Manage your blog categories',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/categories',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Categories', url: '/admin/categories' },
    ],
  });
}

// Helper Functions

function emptyState() {
  return `
    <div class="empty">
      <i data-lucide="folder-tree"></i>
      <h3>No categories yet</h3>
      <p>Create your first category to organize your posts</p>
    </div>
  `;
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
  if (filters.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

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
  const prevHref = page > 1 ? `/admin/categories?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="/admin/categories?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/categories?page=${page + 1}${queryPrefix}` : '#';
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
