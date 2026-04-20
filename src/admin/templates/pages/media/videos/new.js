// New video page template

import { mainLayout } from '../../../layouts/main.js';
import { escapeHtml } from '../../../utils/helpers.js';

/**
 * Generate new video page
 * @param {Object} options - Page options
 * @param {Object} options.user - Current user
 * @param {Array} options.posts - Posts for attachment dropdown
 * @returns {string} - HTML string
 */
export function videosNewPage({ user, posts }) {
  const content = `
    <div class="media">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">New Video</h1>
            <p class="page-header__subtitle">Upload and configure your video</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Upload Form Layout -->
        <div class="media-layout">
          <!-- Left: Upload Zone -->
          <div class="media-layout__content">
            <div class="upload-zone upload-zone--full upload-zone--clickable" id="dropZone" onclick="document.getElementById('videoInput').click()">
              <input 
                type="file" 
                name="video" 
                id="videoInput" 
                form="uploadForm"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo" 
                required
                class="hidden"
                onchange="handleFileSelect(this)"
              />
              <div class="upload-placeholder" id="uploadPlaceholder">
                <p>Drag & Drop or Click to Upload</p>
                <p>MP4, MOV, WebM, AVI</p>
              </div>
              <video id="videoPreview" class="upload-zone__preview" controls></video>
            </div>
          </div>

          <!-- Right: Form -->
          <div class="media-layout__sidebar">
            <div class="card card__panel">
              <form 
                id="uploadForm"
                hx-post="/admin/media/videos" 
                enctype="multipart/form-data"
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
                    placeholder="Describe the video for accessibility"
                    required 
                  />
                  <p class="form-feedback form-feedback--hint">Describe the video for screen readers</p>
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
                  <p class="form-feedback form-feedback--hint">Sets this as the post's featured video</p>
                </div>

                <!-- Form Response -->
                <div id="form-response"></div>

                <!-- Submit Button -->
                <div class="form__group form__group--spaced">
                  <button type="submit" class="btn btn--primary btn--full">
                    Upload Video
                  </button>
                  <a href="/admin/media/videos" class="btn btn--outline btn--full btn--cancel">Cancel</a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Handle file selection
      function handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        // Update filename input
        document.getElementById('fileName').value = file.name;

        // Show preview
        const preview = document.getElementById('videoPreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
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
          const input = document.getElementById('videoInput');
          input.files = files;
          handleFileSelect(input);
        }
      });
    </script>
  `;

  return mainLayout({
    title: 'New Video',
    description: 'Upload a new video to the media library',
    content,
    user,
    activeRoute: '/admin/media/videos',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/videos' },
      { label: 'Videos', url: '/admin/media/videos' },
      { label: 'New', url: '/admin/media/videos/new' },
    ],
  });
}
