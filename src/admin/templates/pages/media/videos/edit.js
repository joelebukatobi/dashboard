// Edit video page template

import { escapeHtml, toPublicMediaUrl, toastQueryScript } from '../../../utils/helpers.js';

/**
 * Edit video page inner content (layout applied via fastify-html addLayout).
 */
export function videosEditContent({ user, video, posts, albums = [], toast }) {
  const toastScript = toastQueryScript(toast, {
    uploaded: 'Video uploaded successfully!',
  });

  return `
    <div class="media">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Video</h1>
            <p class="page-header__subtitle">${escapeHtml(video.originalName)} &bull; ${video.durationFormatted}</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="media-layout media-layout--start">
          <div class="media-layout__content media-layout__content--start">
            <div class="upload-zone upload-zone--preview upload-zone--full video-preview-container">
              <video
                id="videoBg"
                class="video-preview-bg"
                src="${escapeHtml(toPublicMediaUrl(video.path))}"
                muted
                loop
                playsinline
              ></video>
              <video
                id="videoMain"
                class="upload-zone__preview video-preview-main"
                src="${escapeHtml(toPublicMediaUrl(video.path))}"
                controls
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div class="media-layout__sidebar">
            <div class="card card__panel">
              <div class="card__body">
                <form
                  id="editForm"
                  class="form"
                  hx-put="/admin/media/videos/${video.id}"
                  hx-target="#form-response"
                  hx-swap="innerHTML"
                >
                  <div id="form-response"></div>
                  <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />

                  <div class="form__group">
                    <label class="label label--required" for="fileName">File Name</label>
                    <input
                      type="text"
                      name="title"
                      id="fileName"
                      class="input"
                      value="${escapeHtml(video.title || '')}"
                      placeholder="Enter file name"
                      required
                    />
                  </div>

                  <div class="form__group">
                    <label class="label" for="altText">Alt Text</label>
                    <input
                      type="text"
                      name="altText"
                      id="altText"
                      class="input"
                      value="${escapeHtml(video.altText || '')}"
                      placeholder="Describe the video for accessibility"
                    />
                    <p class="form-feedback form-feedback--hint">Describe the video for screen readers</p>
                  </div>

                  <div class="form__group">
                    <label class="label">Video Information</label>
                    <div class="card card__panel media-info-card">
                      <p>
                        <strong>Duration:</strong> ${video.durationFormatted}<br>
                        <strong>Dimensions:</strong> ${video.width || 'N/A'} x ${video.height || 'N/A'}<br>
                        <strong>Size:</strong> ${video.sizeFormatted}<br>
                        <strong>Format:</strong> ${video.mimeType.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div class="form__group">
                    <label class="label" for="albumId">Album (Optional)</label>
                    <select
                      name="albumId"
                      id="albumId"
                      class="form__select-native"
                      data-hs-select='{
                        "hasSearch": true,
                        "searchPlaceholder": "Search albums...",
                        "placeholder": "None",
                        "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option",
                        "searchClasses": "form__select-search__input"
                      }'
                    >
                      <option value="">None</option>
                      ${albums.map((album) => `
                        <option value="${album.id}" ${video.albumId === album.id ? 'selected' : ''}>${escapeHtml(album.title)}</option>
                      `).join('')}
                    </select>
                  </div>

                  <div class="form__group">
                    <label class="label" for="postId">Attach to Post (Optional)</label>
                    <select
                      name="postId"
                      id="postId"
                      class="form__select-native"
                      data-hs-select='{
                        "hasSearch": true,
                        "searchPlaceholder": "Search posts...",
                        "placeholder": "None",
                        "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option",
                        "searchClasses": "form__select-search__input"
                      }'
                    >
                      <option value="">None</option>
                      ${posts.map((post) => `
                        <option value="${post.id}">${escapeHtml(post.title)}</option>
                      `).join('')}
                    </select>
                  </div>
                </form>
              </div>
              <div class="card__footer">
                <div class="form__field-group">
                  <button type="submit" form="editForm" class="btn btn--primary">
                    <i data-lucide="check"></i>
                    Save
                  </button>
                  <a href="/admin/media/videos" class="btn btn--outline btn--cancel">Cancel</a>
                  <button
                    type="button"
                    class="btn btn--danger btn--outline"
                    onclick="openDeleteModal(event)"
                  >
                    <i data-lucide="trash-2"></i>
                    Delete Video
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const mainVideo = document.getElementById('videoMain');
        const bgVideo = document.getElementById('videoBg');

        if (!mainVideo || !bgVideo) return;

        mainVideo.addEventListener('play', function() {
          bgVideo.play();
        });

        mainVideo.addEventListener('pause', function() {
          bgVideo.pause();
        });

        mainVideo.addEventListener('seeking', function() {
          bgVideo.currentTime = mainVideo.currentTime;
        });

        mainVideo.addEventListener('timeupdate', function() {
          if (Math.abs(bgVideo.currentTime - mainVideo.currentTime) > 0.5) {
            bgVideo.currentTime = mainVideo.currentTime;
          }
        });
      });
    </script>
  `;
}

/** Delete confirmation modal for video edit page */
export function videosEditModals({ user, video }) {
  return `
    <div id="deleteModal" class="modal" role="dialog" tabindex="-1">
      <div class="modal__backdrop" onclick="closeDeleteModal()"></div>
      <div class="modal__panel">
        <div class="modal__header">
          <div class="modal__icon modal__icon--danger">
            <i data-lucide="alert-triangle"></i>
          </div>
          <h3 class="modal__title">Are you sure you want to delete?</h3>
          <p class="modal__description">
            Are you sure you want to delete "<span id="deleteVideoName">${escapeHtml(video.originalName)}</span>"?
          </p>
        </div>
        <form
          id="deleteVideoForm"
          hx-delete="/admin/media/videos/${video.id}"
          hx-redirect="/admin/media/videos"
          class="modal__footer"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          <button type="submit" class="btn btn--danger btn--full">Delete Video</button>
          <button type="button" class="btn btn--outline btn--full" onclick="closeDeleteModal()">Cancel</button>
        </form>
      </div>
    </div>

    <script>
      function openDeleteModal(event) {
        if (event) event.preventDefault();
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.add('is-open');
      }

      function closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.remove('is-open');
      }

      document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('deleteModal');
        if (!modal) return;

        modal.addEventListener('click', function(e) {
          if (e.target === modal || e.target.id === 'modalBackdrop') {
            closeDeleteModal();
          }
        });
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeDeleteModal();
        }
      });
    </script>
    ${toastScript}
  `;
}

export function videosEditMeta({ user, video }) {
  return {
    title: 'Edit Video',
    description: `Editing ${video.originalName}`,
    activeRoute: '/admin/media/videos',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/videos' },
      { label: 'Videos', url: '/admin/media/videos' },
      { label: video.title || 'Edit Video', url: `/admin/media/videos/${video.id}/edit` },
    ],
    modals: videosEditModals({ user, video }),
  };
}
