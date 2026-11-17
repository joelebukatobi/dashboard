// Images list — grid (default) or table with bulk actions

import { DeleteModal } from '../../../components/delete-modal.js';
import { listToolbar } from '../../../partials/list-toolbar.js';
import {
  bulkActionsBar,
  bulkSelectCell,
  bulkSelectHead,
  bulkTableScript,
} from '../../../partials/bulk-table.js';
import { mediaPageFitScript, mediaViewToggle } from '../../../partials/media-view.js';
import { escapeHtml, paginationHtml, toastQueryScript, toPublicMediaUrl } from '../../../utils/helpers.js';

/**
 * @param {Object} opts
 * @param {'grid'|'table'} [opts.view]
 * @param {Array} [opts.albums]
 */
export function imagesListContent({
  user,
  images,
  pagination,
  filters,
  toast,
  view = 'grid',
  albums = [],
}) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Image deleted successfully!',
  });

  const searchParams = new URLSearchParams();
  searchParams.set('view', view);
  if (filters.limit) searchParams.set('limit', String(filters.limit));
  const searchUrl = `/admin/media/images?${searchParams.toString()}`;

  const albumOptions = albums
    .map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.title)}</option>`)
    .join('');

  const isTable = view === 'table';

  return `
    <div class="media">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Images</h1>
            <p class="page-header__subtitle">Manage your image library</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        ${listToolbar({
          searchUrl,
          searchTarget: '#images-table-container',
          searchPlaceholder: 'Search images...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/images/new',
          addButtonText: 'Upload Image',
          leadingButtons: mediaViewToggle({
            basePath: '/admin/media/images',
            view,
            filters,
          }),
          extraButtons: `
            <a href="/admin/media/images/batch" class="btn btn--primary list-toolbar__add-btn">
              <span>Batch Upload</span>
            </a>
          `,
        })}

        <form data-bulk-form method="post">
          ${isTable
            ? bulkActionsBar({
                csrfToken: user?.csrfToken || '',
                showAlbum: true,
                showDownload: true,
                albumOptionsHtml: albumOptions,
                deleteAction: '/admin/media/images/bulk-delete',
                albumAction: '/admin/media/images/bulk-album',
                downloadAction: '/admin/media/images/bulk-download',
                entityLabel: 'images',
              })
            : ''}

          <div id="images-table-container" class="${isTable ? 'images__table-content' : 'media-grid'}">
            ${isTable ? imagesTableMarkup(images) : imagesGridMarkup(images)}
          </div>
        </form>

        ${pagination && pagination.totalPages > 1
          ? paginationHtml({
              basePath: '/admin/media/images',
              page: pagination.page,
              totalPages: pagination.totalPages,
              filters: { ...filters, view },
              filterKeys: ['search', 'view', 'limit'],
            })
          : ''}
      </div>
    </div>

    ${toastScript}
    ${isTable ? bulkTableScript() : ''}
    ${mediaPageFitScript({ view })}
  `;
}

export function imagesListMeta({ user }) {
  return {
    title: 'Images',
    description: 'Manage your image library',
    activeRoute: '/admin/media/images',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Images', url: '/admin/media/images' },
    ],
    modals: imagesListModals({ user }),
  };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function imagesGridMarkup(images) {
  if (!images || images.length === 0) {
    return `
      <div class="empty">
        <h3>No images yet</h3>
        <p>Upload your first image to the media library</p>
      </div>
    `;
  }

  return images
    .map((image) => {
      const extension = image.filename.split('.').pop().toUpperCase();
      return `
        <a href="/admin/media/images/${image.id}/edit" class="media-card">
          <div class="media-card__thumbnail">
            <img
              src="${escapeHtml(toPublicMediaUrl(image.thumbnailPath || image.path))}"
              alt="${escapeHtml(image.altText || image.title)}"
            />
            <div class="media-card__details">
              <h3>${escapeHtml(image.originalName)}</h3>
              <span>${image.sizeFormatted} • ${extension}</span>
            </div>
            <div class="media-card__actions-overlay">
              <button
                type="button"
                class="media-card__action-btn"
                data-image-id="${image.id}"
                data-image-name="${escapeHtml(image.originalName)}"
                onclick="event.preventDefault(); event.stopPropagation(); openDeleteModal(this)"
              >
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </a>
      `;
    })
    .join('');
}

function imagesTableMarkup(images) {
  if (!images || images.length === 0) {
    return `
      <div class="empty">
        <h3>No images yet</h3>
        <p>Upload your first image to the media library</p>
      </div>
    `;
  }

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          ${bulkSelectHead()}
          <th></th>
          <th>Filename</th>
          <th>Size</th>
          <th>Album</th>
          <th class="table__td--actions">Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${images
          .map((image) => {
            const thumb = toPublicMediaUrl(image.thumbnailPath || image.path);
            return `
              <tr class="table__tr cursor-pointer" data-href="/admin/media/images/${image.id}/edit">
                ${bulkSelectCell(image.id)}
                <td class="table__td">
                  <span class="table__label">Preview</span>
                  <img src="${escapeHtml(thumb)}" alt="" class="table__thumb" />
                </td>
                <td class="table__td">
                  <span class="table__label">Filename</span>
                  <span class="table__title">${escapeHtml(image.originalName)}</span>
                </td>
                <td class="table__td">
                  <span class="table__label">Size</span>
                  ${escapeHtml(image.sizeFormatted || '')}
                </td>
                <td class="table__td">
                  <span class="table__label">Album</span>
                  ${escapeHtml(image.albumTitle || '—')}
                </td>
                <td class="table__td table__td--actions">
                  <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
                    <a href="/admin/media/images/${image.id}/edit" class="btn btn--ghost row-action row-action--edit">
                      <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
                      <span class="lg:hidden">Edit</span>
                    </a>
                    <button
                      type="button"
                      class="btn btn--ghost row-action row-action--delete"
                      data-image-id="${image.id}"
                      data-image-name="${escapeHtml(image.originalName)}"
                      onclick="event.preventDefault(); event.stopPropagation(); openDeleteModal(this)"
                    >
                      <i data-lucide="trash-2" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
                      <span class="lg:hidden">Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

/** HTMX fragment — preserves current view via filters.view */
export function imagesGridFragment({ images, filters = {} }) {
  const view = filters.view === 'table' ? 'table' : 'grid';
  return view === 'table' ? imagesTableMarkup(images) : imagesGridMarkup(images);
}

export function imagesListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Image',
    entityLabel: 'name',
    deleteUrlPath: '/admin/media/images',
    targetSelector: '#images-table-container',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}

export { formatFileSize };
