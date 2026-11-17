// Videos list — grid (default) or table with bulk actions

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
import { videosService } from '../../../../../services/videos.service.js';

export function videosListContent({
  user,
  videos,
  pagination,
  filters,
  toast,
  view = 'grid',
  albums = [],
}) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Video deleted successfully!',
  });

  const searchParams = new URLSearchParams();
  searchParams.set('view', view);
  if (filters.limit) searchParams.set('limit', String(filters.limit));
  const searchUrl = `/admin/media/videos?${searchParams.toString()}`;

  const albumOptions = albums
    .map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.title)}</option>`)
    .join('');

  const isTable = view === 'table';

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
          searchUrl,
          searchTarget: '#videos-table-container',
          searchPlaceholder: 'Search videos...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/media/videos/new',
          addButtonText: 'Upload Video',
          leadingButtons: mediaViewToggle({
            basePath: '/admin/media/videos',
            view,
            filters,
          }),
        })}

        <form data-bulk-form method="post">
          ${isTable
            ? bulkActionsBar({
                csrfToken: user?.csrfToken || '',
                showAlbum: true,
                showDownload: true,
                albumOptionsHtml: albumOptions,
                deleteAction: '/admin/media/videos/bulk-delete',
                albumAction: '/admin/media/videos/bulk-album',
                downloadAction: '/admin/media/videos/bulk-download',
                entityLabel: 'videos',
              })
            : ''}

          <div id="videos-table-container" class="${isTable ? 'videos__table-content' : 'media-grid'}">
            ${isTable ? videosTableMarkup(videos) : videosGridMarkup(videos)}
          </div>
        </form>

        ${pagination && pagination.totalPages > 1
          ? paginationHtml({
              basePath: '/admin/media/videos',
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
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function videosGridMarkup(videos) {
  if (!videos || videos.length === 0) {
    return `
      <div class="empty">
        <h3>No videos yet</h3>
        <p>Upload your first video to the media library</p>
      </div>
    `;
  }

  return videos
    .map((video) => {
      const extension = video.filename.split('.').pop().toUpperCase();
      return `
        <a href="/admin/media/videos/${video.id}/edit" class="media-card">
          <div class="media-card__thumbnail">
            <img
              src="${escapeHtml(toPublicMediaUrl(video.thumbnailPath || video.path))}"
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
    })
    .join('');
}

function videosTableMarkup(videos) {
  if (!videos || videos.length === 0) {
    return `
      <div class="empty">
        <h3>No videos yet</h3>
        <p>Upload your first video to the media library</p>
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
          <th>Duration</th>
          <th>Size</th>
          <th>Album</th>
          <th class="table__td--actions">Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${videos
          .map((video) => {
            const thumb = toPublicMediaUrl(video.thumbnailPath || video.path);
            return `
              <tr class="table__tr cursor-pointer" data-href="/admin/media/videos/${video.id}/edit">
                ${bulkSelectCell(video.id)}
                <td class="table__td">
                  <span class="table__label">Preview</span>
                  <img src="${escapeHtml(thumb)}" alt="" class="table__thumb" />
                </td>
                <td class="table__td">
                  <span class="table__label">Filename</span>
                  <span class="table__title">${escapeHtml(video.originalName)}</span>
                </td>
                <td class="table__td">
                  <span class="table__label">Duration</span>
                  ${escapeHtml(video.durationFormatted || '')}
                </td>
                <td class="table__td">
                  <span class="table__label">Size</span>
                  ${escapeHtml(video.sizeFormatted || '')}
                </td>
                <td class="table__td">
                  <span class="table__label">Album</span>
                  ${escapeHtml(video.albumTitle || '—')}
                </td>
                <td class="table__td table__td--actions">
                  <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
                    <a href="/admin/media/videos/${video.id}/edit" class="btn btn--ghost row-action row-action--edit">
                      <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
                      <span class="lg:hidden">Edit</span>
                    </a>
                    <button
                      type="button"
                      class="btn btn--ghost row-action row-action--delete"
                      data-video-id="${video.id}"
                      data-video-name="${escapeHtml(video.originalName)}"
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

export function videosGridFragment({ videos, filters = {} }) {
  const view = filters.view === 'table' ? 'table' : 'grid';
  if (view === 'table') return videosTableMarkup(videos);
  // Fragment path may get raw rows without sizeFormatted — normalize lightly
  const rows = (videos || []).map((v) => ({
    ...v,
    sizeFormatted: v.sizeFormatted || formatFileSize(v.size),
    durationFormatted: v.durationFormatted || videosService.formatDuration(v.duration),
  }));
  return videosGridMarkup(rows);
}

export function videosListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Video',
    entityLabel: 'name',
    deleteUrlPath: '/admin/media/videos',
    targetSelector: '#videos-table-container',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}
