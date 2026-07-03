// src/admin/templates/pages/albums/edit.js
// Edit Album Page

import { escapeHtml } from '../../utils/helpers.js';

/**
 * Edit album page inner content (layout applied via fastify-html addLayout).
 */
export function albumEditContent({ user, album, albumImages = [] }) {
  const hasCover = album.coverImage && album.coverImage.path;
  const coverImageId = album.coverImageId || '';

  return `
    <div class="albums">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Album</h1>
            <p class="page-header__subtitle">${escapeHtml(album.title)}</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="card">
          <div class="card__header">
            <h2>Album Details</h2>
          </div>
          <div class="card__body">
            <form
              class="form"
              id="editAlbumForm"
              hx-put="/admin/media/albums/${album.id}"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div id="form-response"></div>

              <div class="form__row form__row--sidebar">
                <!-- Left Column: Cover Image -->
                <div class="form__group">
                  <label class="label">Cover Image</label>
                  <div class="form__photo" id="coverPreviewContainer">
                    ${hasCover
                      ? `<img src="${album.coverImage.path}" alt="${escapeHtml(album.title)}" id="coverPreviewImg" />`
                      : `<div class="form__photo-placeholder" id="coverPreviewPlaceholder">${escapeHtml(album.title)}</div>`
                    }
                  </div>
                </div>

                <!-- Right Column: Form Fields -->
                <div>
                  <div class="form__row form__row--2col">
                    <div class="form__group">
                      <label class="label label--required" for="title">Title</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        class="input"
                        value="${escapeHtml(album.title)}"
                        required
                      />
                    </div>
                    <div class="form__group">
                      <label class="label" for="slug">Slug</label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        class="input"
                        value="${escapeHtml(album.slug)}"
                      />
                      <p class="form-feedback form-feedback--hint">Auto-generated from title</p>
                    </div>
                  </div>

                  <div class="form__group">
                    <label class="label" for="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      class="textarea"
                      rows="4"
                      placeholder="Enter album description..."
                    >${escapeHtml(album.description || '')}</textarea>
                  </div>
                </div>
              </div>

              <!-- Cover Image Selection Grid -->
              ${albumImages.length > 0 ? `
                <div class="form__group album-cover-section">
                  <label class="label">Select Cover Image</label>
                  <p class="form-feedback form-feedback--hint">Click an image to set it as the album cover</p>
                  <div class="album-image-grid">
                    ${albumImages.map(img => `
                      <div 
                        class="album-image-option ${img.id === coverImageId ? 'album-image-option--selected' : ''}"
                        data-image-id="${img.id}"
                        data-image-path="${img.path}"
                        onclick="selectCoverImage('${img.id}', '${img.path}')"
                      >
                        <img src="${img.thumbnailPath || img.path}" alt="${escapeHtml(img.title || '')}" />
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : `
                <p class="form-feedback form-feedback--hint album-cover-section">Upload images to this album to set a cover</p>
              `}

              <input type="hidden" name="coverImageId" id="coverImageId" value="${coverImageId}" />
              <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
            </form>
          </div>
          <div class="card__footer">
            <div class="form__field-group">
              <button type="button" class="btn btn--primary" onclick="submitForm()">
                <i data-lucide="check"></i>
                Save
              </button>
              <a href="/admin/media/albums" class="btn btn--outline btn--cancel">Cancel</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      function selectCoverImage(imageId, imagePath) {
        document.getElementById('coverImageId').value = imageId;
        
        // Update visual selection on grid
        document.querySelectorAll('.album-image-option').forEach(el => {
          el.classList.toggle('album-image-option--selected', el.dataset.imageId === imageId);
        });

        // Update the main cover preview
        const container = document.getElementById('coverPreviewContainer');
        container.innerHTML = '<img src="' + imagePath + '" alt="${escapeHtml(album.title)}" id="coverPreviewImg" />';
      }
      
      function submitForm() {
        htmx.trigger('#editAlbumForm', 'submit');
      }
    </script>
  `;
}

export function albumEditMeta({ album }) {
  return {
    title: `Edit Album - ${album.title}`,
    description: 'Edit album details',
    activeRoute: '/admin/media/albums',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Albums', url: '/admin/media/albums' },
      { label: album.title, url: `/admin/media/albums/${album.id}/edit` },
    ],
  };
}
