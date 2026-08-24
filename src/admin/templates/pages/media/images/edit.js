// Edit image page template

import { escapeHtml, toPublicMediaUrl, toastQueryScript } from '../../../utils/helpers.js';

/**
 * Edit image page inner content (layout applied via fastify-html addLayout).
 */
export function imagesEditContent({ user, image, posts, albums = [], toast }) {
  const toastScript = toastQueryScript(toast, {
    uploaded: 'Image uploaded successfully!',
  });

  return `
    <div class="media">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Image</h1>
            <p class="page-header__subtitle">${escapeHtml(image.originalName)}</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="media-layout media-layout--start">
          <div class="media-layout__content media-layout__content--start">
            <div class="upload-zone upload-zone--preview upload-zone--full image-preview-container">
              <img
                class="image-preview-bg"
                src="${escapeHtml(toPublicMediaUrl(image.path))}"
                alt=""
              />
              <img
                class="image-preview-main"
                src="${escapeHtml(toPublicMediaUrl(image.path))}"
                alt="${escapeHtml(image.altText || image.title || '')}"
              />
            </div>
          </div>

          <div class="media-layout__sidebar">
            <div class="card card__panel">
              <div class="card__body">
                <form
                  id="editForm"
                  class="form"
                  hx-put="/admin/media/images/${image.id}"
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
                      value="${escapeHtml(image.title || '')}"
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
                      value="${escapeHtml(image.altText || '')}"
                      placeholder="Describe the image for accessibility"
                    />
                    <p class="form-feedback form-feedback--hint">Describe the image for screen readers</p>
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
                        <option value="${album.id}" ${image.albumId === album.id ? 'selected' : ''}>${escapeHtml(album.title)}</option>
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
                  <a href="/admin/media/images" class="btn btn--outline btn--cancel">Cancel</a>
                  <button
                    type="button"
                    class="btn btn--danger btn--outline"
                    onclick="openDeleteModal(event)"
                  >
                    <i data-lucide="trash-2"></i>
                    Delete Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Delete confirmation modal for image edit page */
export function imagesEditModals({ user, image }) {
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
            Are you sure you want to delete "<span id="deleteImageName">${escapeHtml(image.originalName)}</span>"?
          </p>
        </div>
        <form
          id="deleteImageForm"
          hx-delete="/admin/media/images/${image.id}"
          hx-redirect="/admin/media/images"
          class="modal__footer"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          <button type="submit" class="btn btn--danger btn--full">Delete Image</button>
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

export function imagesEditMeta({ user, image }) {
  return {
    title: 'Edit Image',
    description: `Editing ${image.originalName}`,
    activeRoute: '/admin/media/images',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Images', url: '/admin/media/images' },
      { label: image.title || 'Edit Image', url: `/admin/media/images/${image.id}/edit` },
    ],
    modals: imagesEditModals({ user, image }),
  };
}
