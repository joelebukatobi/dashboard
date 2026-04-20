// Videos list page template - Refactored with list-toolbar partial

import { mainLayout } from '../../../layouts/main.js';
import { DeleteModal } from '../../../components/delete-modal.js';
import { listToolbar } from '../../../partials/list-toolbar.js';
import { escapeHtml } from '../../../utils/helpers.js';

/**
 * Generate videos list page
 * @param {Object} options - Page options
 * @param {Object} options.user - Current user
 * @param {Array} options.videos - Video list
 * @param {Object} options.pagination - Pagination data
 * @param {Object} options.stats - Statistics
 * @param {Object} options.filters - Active filters
 * @param {string} [options.toast] - Toast message
 * @returns {string} - HTML string
 */
export function videosListPage({ user, videos, pagination, stats, filters, toast }) {
  // Build toast script if toast param is present
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          deleted: 'Video deleted successfully!',
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

  // Initialize delete modal
  const deleteModal = new DeleteModal({
    entityName: 'Video',
    entityLabel: 'name',
    deleteUrlPath: '/admin/media/videos',
    targetSelector: '.media-grid',
    csrfToken: user?.csrfToken || ''
  });

  const content = `
    <div class="media">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Videos</h1>
            <p class="page-header__subtitle">Manage your video library</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchPlaceholder: 'Search videos...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/videos/new',
          addButtonText: 'New Video',
        })}

        <!-- Media Grid -->
        <div class="media-grid">
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
          page: pagination.page, 
          totalPages: pagination.totalPages, 
          filters 
        }) : ''}
      </div>
    </div>
  </div>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Videos',
    description: 'Manage your video library',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/media/videos',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Videos', url: '/admin/media/videos' },
    ],
  });
}


/**
 * Generate pagination HTML
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page
 * @param {number} options.totalPages - Total pages
 * @param {Object} options.filters - Active filters
 * @returns {string} - Pagination HTML
 */
function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/media/videos?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="/admin/media/videos?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/media/videos?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}
