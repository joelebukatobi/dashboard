// src/admin/templates/pages/albums/list.js
// Albums List Page

import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, paginationHtml, toastQueryScript, toPublicMediaUrl } from '../../utils/helpers.js';

/**
 * Albums list page inner content (layout applied via fastify-html addLayout).
 */
export function albumsListContent({ albums, total, page, totalPages, filters, toast }) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Album deleted successfully!',
  });

  return `
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
              ${albums.map((album) => `
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
              `).join('')}
            </tbody>
          </table>
        `}
        </div>

        ${totalPages > 1 ? paginationHtml({ basePath: '/admin/media/albums', page, totalPages, filters, filterKeys: ['search'] }) : ''}
      </div>
    </div>

    ${toastScript}
  `;
}

/** Page metadata for albums list */
export function albumsListMeta({ user }) {
  return {
    title: 'Albums',
    description: 'Organize images and videos into albums',
    activeRoute: '/admin/media/albums',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Albums', url: '/admin/media/albums' },
    ],
    modals: albumsListModals({ user }),
  };
}

/** HTMX table fragment for albums list */
export function albumsTableFragment({ albums, pagination }) {
  if (!albums || albums.length === 0) {
    return `
      <div class="empty">
        <h3>No albums found</h3>
        <p>Create your first album to organize images and videos.</p>
      </div>
    `;
  }

  const rows = albums.map((album) => {
    const coverSrc = toPublicMediaUrl(album.coverImage?.thumbnailPath || album.coverImage?.path) || '/favicon.svg';
    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Album</span>
          <div class="flex items-center gap-3">
            <img src="${coverSrc}" alt="" class="w-10 h-10 rounded object-cover" />
            <div class="table__title">
              <a href="/admin/media/albums/${album.id}/edit">${album.title}</a>
            </div>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${album.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${album.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Created</span>
          ${new Date(album.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/media/albums/${album.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-album-id="${album.id}"
              data-album-title="${album.title}"
              onclick="openDeleteModal(this)"
            >
              <i data-lucide="trash-2" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const paginationFragment = pagination && pagination.totalPages > 1
    ? paginationHtml({
        basePath: '/admin/media/albums',
        page: pagination.page,
        totalPages: pagination.totalPages,
        filters: {},
        filterKeys: ['search'],
      })
    : '';

  return `
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
        ${rows}
      </tbody>
    </table>
    ${paginationFragment}
  `;
}

/** Delete modal HTML for albums list page */
export function albumsListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Album',
    entityLabel: 'title',
    deleteUrlPath: '/admin/media/albums',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}

function emptyState() {
  return `
    <div class="empty">
      <h3>No albums yet</h3>
      <p>Create your first album to organize images and videos</p>
    </div>
  `;
}
