// Videos list page template

import { mainLayout } from '../../../layouts/main.js';
import { DeleteModal } from '../../../components/delete-modal.js';

const listToolbarClass = 'mb-[1.6rem] flex shrink-0 flex-row items-center gap-[1.6rem]';
const listToolbarSearchClass = 'relative min-w-0 flex-1';
const listToolbarSearchIconClass = 'pointer-events-none absolute left-[1rem] top-1/2 h-[1.6rem] w-[1.6rem] -translate-y-1/2 text-grey-400 dark:text-grey-500';
const listToolbarInputClass = 'h-[3.2rem] w-full rounded-md border border-grey-100/50 bg-white px-[1.2rem] pl-[4.4rem] text-body-sm text-grey-900 outline-none transition-all duration-200 placeholder:text-body-sm placeholder:text-grey-400 hover:border-grey-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-grey-700 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-500 dark:hover:border-grey-600';
const listToolbarControlsClass = 'flex shrink-0 items-center gap-[1.2rem]';
const listToolbarButtonClass = 'inline-flex h-[3.2rem] items-center justify-center gap-[0.8rem] rounded-md bg-blue-600 px-[1.2rem] text-body-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:text-white focus:ring-[.08rem] focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-grey-900 dark:hover:bg-grey-100';

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
        <div class="${listToolbarClass}">
          <div class="${listToolbarSearchClass}">
            <i data-lucide="search" class="${listToolbarSearchIconClass}"></i>
            <input
              type="text"
              class="${listToolbarInputClass}"
              placeholder="Search videos..."
              value="${filters.search || ''}"
              hx-get="/admin/media/videos"
              hx-target=".media-grid"
              hx-trigger="keyup changed delay:500ms"
              name="search"
            />
          </div>

          <div class="${listToolbarControlsClass}">
            <a href="/admin/media/videos/new" class="${listToolbarButtonClass}">
              New Video
            </a>
          </div>
        </div>

        <!-- Media Grid -->
        <div class="media-grid">
          ${videos && videos.length > 0 ? videos.map((video) => {
            const extension = video.filename.split('.').pop().toUpperCase();
            return `
              <a href="/admin/media/videos/${video.id}/edit" class="media-card group">
                <div class="media-card__thumbnail">
                  <img
                    src="${(video.thumbnailPath || video.path).startsWith('/public') ? (video.thumbnailPath || video.path) : '/public' + (video.thumbnailPath || video.path)}"
                    alt="${escapeHtml(video.altText || video.title)}"
                  />
                  <div class="media-card__thumbnail-badge">${video.durationFormatted}</div>
                  <div class="media-card__details">
                    <h3 class="media-card__title">${escapeHtml(video.originalName)}</h3>
                    <span class="media-card__meta">${video.sizeFormatted} • ${extension}</span>
                  </div>
                  <div class="media-card__actions-overlay">
                    <button 
                      type="button"
                      class="media-card__action-btn"
                      onclick="event.preventDefault(); event.stopPropagation();"
                    >
                      <i data-lucide="pencil"></i>
                    </button>
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

  <!-- Toast Script -->
  ${toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof showToast === 'function') {
          showToast(${JSON.stringify(toast)}, 'success');
        }
      });
    </script>
  ` : ''}

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
      { label: 'Media', url: '/admin/media/videos' },
      { label: 'Videos', url: '/admin/media/videos' },
    ],
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${generatePaginationLinks(page, totalPages, queryPrefix)}
      </div>
    </footer>
  `;
}

/**
 * Generate pagination link buttons
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @param {string} queryPrefix - Query string prefix
 * @returns {string} - Pagination links HTML
 */
function generatePaginationLinks(page, totalPages, queryPrefix) {
  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return links;
}
