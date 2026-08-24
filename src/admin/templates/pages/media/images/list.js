// Images list page template - Refactored with list-toolbar partial

import { DeleteModal } from '../../../components/delete-modal.js';
import { listToolbar } from '../../../partials/list-toolbar.js';
import { escapeHtml, paginationHtml, toastQueryScript, toPublicMediaUrl } from '../../../utils/helpers.js';

/**
 * Images list page inner content (layout applied via fastify-html addLayout).
 */
export function imagesListContent({ images, pagination, filters, toast }) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Image deleted successfully!',
  });

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
          searchUrl: '/admin/media/images',
          searchTarget: '#images-table-container',
          searchPlaceholder: 'Search images...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/images/new',
          addButtonText: 'Upload Image',
          extraButtons: `
            <a href="/admin/media/images/batch" class="btn btn--primary list-toolbar__add-btn">
              <i data-lucide="images"></i>
              <span>Batch Upload</span>
            </a>
          `,
        })}

        <div id="images-table-container" class="media-grid">
          ${images && images.length > 0 ? images.map((image) => {
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
          }).join('') : `
          <div class="empty">
            <h3>No images yet</h3>
            <p>Upload your first image to the media library</p>
          </div>
        `}
        </div>

        ${pagination && pagination.totalPages > 1 ? paginationHtml({
          basePath: '/admin/media/images',
          page: pagination.page,
          totalPages: pagination.totalPages,
          filters,
          filterKeys: ['search'],
        }) : ''}
      </div>
    </div>

    ${toastScript}
  `;
}

/** Page metadata for images list */
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** HTMX grid fragment for images list */
export function imagesGridFragment({ images }) {
  if (!images || images.length === 0) {
    return `
      <div class="empty">
        <h3>No images yet</h3>
        <p>Upload your first image to the media library</p>
      </div>
    `;
  }

  return images.map((image) => {
    const sizeFormatted = formatFileSize(image.size);
    const extension = image.filename.split('.').pop().toUpperCase();
    const imgPath = toPublicMediaUrl(image.thumbnailPath || image.path);

    return `
      <a href="/admin/media/images/${image.id}/edit" class="media-card">
        <div class="media-card__thumbnail">
          <img
            src="${escapeHtml(imgPath)}"
            alt="${image.altText || image.title}"
          />
          <div class="media-card__details">
            <h3>${image.originalName}</h3>
            <span>${sizeFormatted} • ${extension}</span>
          </div>
          <div class="media-card__actions-overlay">
            <button
              type="button"
              class="media-card__action-btn"
              data-image-id="${image.id}"
              data-image-name="${image.originalName}"
              onclick="event.preventDefault(); event.stopPropagation(); openDeleteModal(this)"
            >
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/** Delete modal HTML for images list page */
export function imagesListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Image',
    entityLabel: 'name',
    deleteUrlPath: '/admin/media/images',
    targetSelector: '.media-grid',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}
