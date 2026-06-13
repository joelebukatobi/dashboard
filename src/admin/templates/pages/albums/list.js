// src/admin/templates/pages/albums/list.js
// Albums List Page

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate } from '../../utils/helpers.js';

export function albumsListPage({ albums, total, page, totalPages, filters, user, toast }) {
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          deleted: 'Album deleted successfully!',
        };
        const message = toastMessages['${toast}'] || '${toast}';
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  ` : '';

  const deleteModal = new DeleteModal({
    entityName: 'Album',
    entityLabel: 'title',
    deleteUrlPath: '/admin/media/albums',
    csrfToken: user?.csrfToken || '',
  });

  const content = `
    <div class="albums">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Albums</h1>
            <p class="page-header__subtitle">Organize images and videos into albums</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        ${listToolbar({
          searchUrl: '/admin/media/albums',
          searchTarget: '#albums-table-container',
          searchPlaceholder: 'Search albums...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/albums/new',
          addButtonText: albums.length === 0 ? 'Create First Album' : 'New Album',
        })}

        <div id="albums-table-container" class="albums__table-content">
        ${
          albums.length === 0
            ? emptyState()
            : `
          <table class="table">
            <thead class="table__thead">
              <tr>
                <th>Album</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody class="table__tbody">
              ${albums.map((album) => {
                return `
                <tr class="table__tr">
                  <td class="table__td">
                    <span class="table__label">Album</span>
                    <div class="table__title">
                      <a href="/admin/media/albums/${album.id}/edit">${escapeHtml(album.title)}</a>
                    </div>
                  </td>
                  <td class="table__td">
                    <span class="table__label">Slug</span>
                    <div>${album.slug}</div>
                  </td>
                  <td class="table__td">
                    <span class="table__label">Description</span>
                    <div>${album.description || '-'}</div>
                  </td>
                  <td class="table__td">
                    <span class="table__label">Created</span>
                    ${formatDate(album.createdAt)}
                  </td>
                  <td class="table__td table__td--actions">
                    <div class="row-actions">
                      <a href="/admin/media/albums/${album.id}/edit" class="btn btn--ghost row-action row-action--edit">
                        <i data-lucide="pencil"></i>
                        <span>Edit</span>
                      </a>
                      <button
                        type="button"
                        class="btn btn--ghost row-action row-action--delete"
                        data-album-id="${album.id}"
                        data-album-title="${escapeHtml(album.title)}"
                        onclick="openDeleteModal(this)"
                      >
                        <i data-lucide="trash-2"></i>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `}).join('')}
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
    title: 'Albums',
    description: 'Organize images and videos into albums',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/media/albums',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Albums', url: '/admin/media/albums' },
    ],
  });
}

function emptyState() {
  return `
    <div class="empty">
      <h3>No albums yet</h3>
      <p>Create your first album to organize images and videos</p>
    </div>
  `;
}

function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/media/albums?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

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
      links += `<a href="/admin/media/albums?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/media/albums?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">${links}</div>
    </footer>
  `;
}
