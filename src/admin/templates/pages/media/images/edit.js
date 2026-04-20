// Edit image page template - Exact clone of new.js with prefilled data

import { mainLayout } from '../../../layouts/main.js';
import { escapeHtml } from '../../../utils/helpers.js';

/**
 * Generate image edit page
 * @param {Object} options - Page options
 * @param {Object} options.user - Current user
 * @param {Object} options.image - Image data
 * @param {Array} options.posts - Posts for attachment dropdown
 * @returns {string} - HTML string
 */
export function imagesEditPage({ user, image, posts }) {
  const content = `
    <div class="media">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Image</h1>
            <p class="page-header__subtitle">${escapeHtml(image.originalName)}</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Edit Form Layout -->
        <div class="media-layout media-layout--start">
          <!-- Left: Image Preview -->
          <div class="media-layout__content media-layout__content--start">
            <div class="upload-zone upload-zone--preview upload-zone--full">
              <img 
                class="upload-zone__preview upload-zone__preview--visible" 
                src="${image.path}"
                alt="${escapeHtml(image.altText || image.title || '')}"
              />
            </div>
          </div>

          <!-- Right: Form -->
          <div class="media-layout__sidebar">
            <div class="card card__panel">
              <form 
                id="editForm"
                hx-put="/admin/media/images/${image.id}"
                hx-target="#form-response"
                hx-swap="innerHTML"
              >
                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
                
                <!-- File Name -->
                <div class="form__group">
                  <label class="label">File Name</label>
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

                <!-- Alt Text -->
                <div class="form__group">
                  <label class="label">Alt Text *</label>
                  <input 
                    type="text" 
                    name="altText" 
                    class="input"
                    value="${escapeHtml(image.altText || '')}"
                    placeholder="Describe the image for accessibility"
                    required 
                  />
                  <p class="form-feedback form-feedback--hint">Describe the image for screen readers</p>
                </div>

                <!-- Attach to Post -->
                <div class="form__group form__group--spaced">
                  <label class="label">Attach to Post (Optional)</label>
                  <select 
                    name="postId" 
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
                    ${posts.map(post => `
                      <option value="${post.id}">${escapeHtml(post.title)}</option>
                    `).join('')}
                  </select>
                </div>

                <!-- Form Response -->
                <div id="form-response"></div>

                <!-- Submit Button -->
                <div class="form__group form__group--tight">
                  <button type="submit" class="btn btn--primary btn--full">
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    class="btn btn--danger btn--outline btn--full btn--spaced"
                    onclick="openDeleteModal(event)"
                  >
                    Delete Image
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
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
  `;

  return mainLayout({
    title: 'Edit Image',
    description: `Editing ${image.originalName}`,
    content,
    user,
    activeRoute: '/admin/media/images',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Images', url: '/admin/media/images' },
      { label: image.title || 'Edit', url: `/admin/media/images/${image.id}/edit` },
    ],
  });
}
