// Videos list page template - Refactored with list-toolbar partial

import { DeleteModal } from '../../../components/delete-modal.js';
import { listToolbar } from '../../../partials/list-toolbar.js';
import { escapeHtml, paginationHtml, toastQueryScript } from '../../../utils/helpers.js';
import { videosService } from '../../../../../services/videos.service.js';

/**
 * Videos list page inner content (layout applied via fastify-html addLayout).
 */
export function videosListContent({ videos, pagination, filters, toast }) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Video deleted successfully!',
  });

  return `
    <div class="media">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Videos</h1>
            <p class="page-header__subtitle">Manage your video library</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        ${listToolbar({
          searchUrl: '/admin/media/videos',
          searchTarget: '#videos-table-container',
          searchPlaceholder: 'Search videos...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/videos/new',
          addButtonText: 'Upload Video',
        })}

        <div id="videos-table-container" class="media-grid">
          ${videos && videos.length > 0 ? videos.map((video) => {
            const extension = video.filename.split('.').pop().toUpperCase();
            return `
              <a href="/admin/media/videos/${video.id}/edit" class="media-card">
                <div class="media-card__thumbnail">
                  <img
                    src="${(video.thumbnailPath || video.path).startsWith('/public') ? (video.thumbnailPath || video.path) : '/public' + (video.thumbnailPath || video.path)}"
                    alt="${escapeHtml(video.altText || video.title)}"
                  />
                  <div class="media-card__thumbnail-badge">${video.durationFormatted}</div>
                  <div class="media-card__details">
                    <h3>${escapeHtml(video.originalName)}</h3>
                    <span>${video.sizeFormatted} • ${extension}</span>
                  </div>
                  <div class="media-card__actions-overlay">
                    <button
                      type="button"
                      class="media-card__action-btn"
                      data-video-id="${video.id}"
                      data-video-name="${escapeHtml(video.originalName)}"
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
            <h3>No videos yet</h3>
            <p>Upload your first video to the media library</p>
          </div>
        `}
        </div>

        ${pagination && pagination.totalPages > 1 ? paginationHtml({
          basePath: '/admin/media/videos',
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

/** Page metadata for videos list */
export function videosListMeta({ user }) {
  return {
    title: 'Videos',
    description: 'Manage your video library',
    activeRoute: '/admin/media/videos',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Videos', url: '/admin/media/videos' },
    ],
    modals: videosListModals({ user }),
  };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** HTMX grid fragment for videos list */
export function videosGridFragment({ videos }) {
  if (!videos || videos.length === 0) {
    return `
      <div class="empty">
        <h3>No videos yet</h3>
        <p>Upload your first video to the media library</p>
      </div>
    `;
  }

  return videos.map((video) => {
    const sizeFormatted = formatFileSize(video.size);
    const extension = video.filename.split('.').pop().toUpperCase();
    const durationFormatted = videosService.formatDuration(video.duration);
    const imgPath = (video.thumbnailPath || video.path).startsWith('/public')
      ? (video.thumbnailPath || video.path)
      : '/public' + (video.thumbnailPath || video.path);

    return `
      <a href="/admin/media/videos/${video.id}/edit" class="media-card">
        <div class="media-card__thumbnail">
          <img
            src="${imgPath}"
            alt="${video.altText || video.title}"
          />
          <div class="media-card__thumbnail-badge">${durationFormatted}</div>
          <div class="media-card__details">
            <h3>${video.originalName}</h3>
            <span>${sizeFormatted} • ${extension}</span>
          </div>
          <div class="media-card__actions-overlay">
            <button
              type="button"
              class="media-card__action-btn"
              data-video-id="${video.id}"
              data-video-name="${video.originalName}"
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

/** Delete modal HTML for videos list page */
export function videosListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Video',
    entityLabel: 'name',
    deleteUrlPath: '/admin/media/videos',
    targetSelector: '.media-grid',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}
