// src/admin/templates/pages/tags/list.js
// Tags List Page - Refactored with list-toolbar partial

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate } from '../../utils/helpers.js';



/**
 * Tags List Page Template
 * Display all tags with search and pagination
 */
export function tagsListPage({ tags, total, page, totalPages, filters, user, toast }) {
  // Build toast script if toast param is present
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          deleted: 'Tag deleted successfully!',
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
    entityName: 'Tag',
    entityLabel: 'name',
    deleteUrlPath: '/admin/tags',
    csrfToken: user?.csrfToken || '',
    hasConditionalMessage: true,
    conditionalConfig: {
      messageWithItems: 'The {name} tag has {count} post(s). They will be affected.',
      messageWithoutItems: 'This action cannot be undone. The {name} tag will be permanently deleted.',
      countAttribute: 'data-post-count'
    }
  });

  const content = `
    <div class="tags">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Tags</h1>
            <p class="page-header__subtitle">Manage your tags</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchPlaceholder: 'Search tags...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/tags/new',
          addButtonText: tags.length === 0 ? 'Create First Tag' : 'New Tag',
        })}

        <div class="tags__table-content">
        ${
          tags.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
              <thead class="table__thead">
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Posts</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody">
                ${tags
                  .map(
                    (tag) => `
                  <tr class="table__tr">
                    <td class="table__td">
                      <span class="table__label">Name</span>
                      <div class="table__title">
                        <a href="/admin/tags/${tag.id}/edit">${escapeHtml(tag.name)}</a>
                      </div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Slug</span>
                      <div>${tag.slug}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Description</span>
                      <div>${tag.description || '-'}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Posts</span>
                      <span class="badge badge--neutral">${tag.postCount || 0}</span>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Date</span>
                      ${formatDate(tag.createdAt)}
                    </td>
                    <td class="table__td table__td--actions">
                      <div class="row-actions">
                        <a href="/admin/tags/${tag.id}/edit" class="btn btn--ghost row-action row-action--edit">
                          <i data-lucide="pencil"></i>
                          <span>Edit</span>
                        </a>
                        <button
                          type="button"
                          class="btn btn--ghost row-action row-action--delete"
                          data-tag-id="${tag.id}"
                          data-tag-name="${escapeHtml(tag.name)}"
                          data-post-count="${tag.postCount || 0}"
                          onclick="openDeleteModal(this)"
                        >
                          <i data-lucide="trash-2"></i>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
        `}
        </div>

        ${totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Tags',
    description: 'Manage your blog tags',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/tags',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Tags', url: '/admin/tags' },
    ],
  });
}

// Helper Functions

function emptyState() {
  return `
    <div class="empty">
      <h3>No tags yet</h3>
      <p>Create your first tag to organize your posts</p>
    </div>
  `;
}

function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/tags?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="/admin/tags?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/tags?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}
