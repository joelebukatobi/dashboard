// New image page template

import { escapeHtml } from '../../../utils/helpers.js';

/**
 * New image page inner content (layout applied via fastify-html addLayout).
 */
export function imagesNewContent({ user, posts }) {
  return `
    <div class="media">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">New Image</h1>
            <p class="page-header__subtitle">Upload and configure your image</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Upload Form Layout -->
        <form 
          id="uploadForm"
          class="form media-layout"
          hx-post="/admin/media/images" 
          hx-encoding="multipart/form-data"
          hx-target="#form-response"
          hx-swap="innerHTML"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          
          <!-- Left: Upload Zone -->
          <div class="media-layout__content">
            <div class="upload-zone upload-zone--clickable" id="dropZone">
              <input 
                type="file" 
                name="image" 
                id="imageInput" 
                accept="image/jpeg,image/png,image/webp,image/gif" 
                required
                class="upload-zone__input"
                onchange="handleFileSelect(this)"
              />
              <div class="upload-placeholder" id="uploadPlaceholder">
                <p>Drag & Drop or Click to Upload</p>
                <p>JPEG, PNG, WebP, GIF up to 50MB</p>
              </div>
              <!-- Background image (blurred backdrop) -->
              <img id="imagePreviewBg" class="image-preview-bg hidden" />
              <!-- Main image (foreground, natural aspect ratio) -->
              <img id="imagePreview" class="image-preview-main hidden" />
            </div>
          </div>

          <!-- Right: Form Fields -->
          <div class="media-layout__sidebar">
            <div class="card card__panel">
              <div class="card__body">
                <div id="form-response"></div>
                
                <!-- File Name -->
                <div class="form__group">
                  <label class="label label--required" for="fileName">File Name</label>
                  <input 
                    type="text" 
                    name="title" 
                    id="fileName" 
                    class="input"
                    placeholder="Enter file name"
                    required 
                  />
                </div>

                <!-- Alt Text -->
                <div class="form__group">
                    <label class="label" for="altText">Alt Text</label>
                    <input 
                      type="text" 
                      name="altText" 
                      id="altText"
                      class="input"
                      placeholder="Describe the image for accessibility"
                    />
                  <p class="form-feedback form-feedback--hint">Describe the image for screen readers</p>
                </div>

                <!-- Attach to Post -->
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
                    ${posts.map(post => `
                      <option value="${post.id}">${escapeHtml(post.title)}</option>
                    `).join('')}
                  </select>
                  <p class="form-feedback form-feedback--hint">Sets this as the post's featured image</p>
                </div>
              </div>
              <div class="card__footer">
                <div class="form__field-group">
                  <button type="submit" class="btn btn--primary">
                    <i data-lucide="upload"></i>
                    Upload Image
                  </button>
                  <a href="/admin/media/images" class="btn btn--outline btn--cancel">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Debug htmx requests
      document.body.addEventListener('htmx:beforeRequest', function(evt) {
        console.log('htmx:beforeRequest', evt.detail);
        const formData = evt.detail.requestConfig.parameters;
        console.log('Form data keys:', Array.from(formData.keys()));
        console.log('Form data values:', Array.from(formData.entries()));
      });
      
      document.body.addEventListener('htmx:afterRequest', function(evt) {
        console.log('htmx:afterRequest', evt.detail);
      });
      
      document.body.addEventListener('htmx:responseError', function(evt) {
        console.error('htmx:responseError', evt.detail);
      });

      // Handle file selection
      function handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        // Update filename input
        document.getElementById('fileName').value = file.name;

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.getElementById('imagePreview');
          const previewBg = document.getElementById('imagePreviewBg');
          const placeholder = document.getElementById('uploadPlaceholder');
          const dropZone = document.getElementById('dropZone');
          preview.src = e.target.result;
          previewBg.src = e.target.result;
          preview.classList.remove('hidden');
          previewBg.classList.remove('hidden');
          dropZone.classList.add('image-preview-container');
          placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
      }

      // Drag and drop
      const dropZone = document.getElementById('dropZone');
      
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('upload-zone--dragover');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('upload-zone--dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('upload-zone--dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const input = document.getElementById('imageInput');
          input.files = files;
          handleFileSelect(input);
        }
      });
    </script>
  `;
}

export function imagesNewMeta() {
  return {
    title: 'New Image',
    description: 'Upload a new image to the media library',
    activeRoute: '/admin/media/images',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Images', url: '/admin/media/images' },
      { label: 'New Image', url: '/admin/media/images/new' },
    ],
  };
}
