// New video page template

import { escapeHtml } from '../../../utils/helpers.js';

/**
 * New video page inner content (layout applied via fastify-html addLayout).
 */
export function videosNewContent({ user, posts }) {
  return `
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
        <form 
          id="uploadForm"
          class="form media-layout"
          hx-post="/admin/media/videos" 
          hx-encoding="multipart/form-data"
          hx-target="#form-response"
          hx-swap="innerHTML"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          
          <!-- Left: Upload Zone -->
          <div class="media-layout__content">
            <div class="upload-zone upload-zone--full upload-zone--clickable" id="dropZone">
              <input 
                type="file" 
                name="video" 
                id="videoInput" 
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo" 
                required
                class="upload-zone__input"
                onchange="handleFileSelect(this)"
              />
              <div class="upload-placeholder" id="uploadPlaceholder">
                <p>Drag & Drop or Click to Upload</p>
                <p>MP4, MOV, WebM, AVI</p>
              </div>
              <!-- Background video (blurred backdrop) -->
              <video id="videoPreviewBg" class="video-preview-bg hidden" muted loop playsinline></video>
              
              <!-- Main video (foreground) -->
              <video id="videoPreview" class="video-preview-main hidden" controls></video>
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
                      placeholder="Describe the video for accessibility"
                    />
                  <p class="form-feedback form-feedback--hint">Describe the video for screen readers</p>
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
                  <p class="form-feedback form-feedback--hint">Sets this as the post's featured video</p>
                </div>
              </div>
              <div class="card__footer">
                <div class="form__field-group">
                  <button type="submit" class="btn btn--primary">
                    <i data-lucide="upload"></i>
                    Upload Video
                  </button>
                  <a href="/admin/media/videos" class="btn btn--outline btn--cancel">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </form>
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
        const previewBg = document.getElementById('videoPreviewBg');
        const placeholder = document.getElementById('uploadPlaceholder');
        const dropZone = document.getElementById('dropZone');
        const objectUrl = URL.createObjectURL(file);
        preview.src = objectUrl;
        previewBg.src = objectUrl;
        preview.classList.remove('hidden');
        previewBg.classList.remove('hidden');
        dropZone.classList.add('video-preview-container');
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
}

export function videosNewMeta() {
  return {
    title: 'New Video',
    description: 'Upload a new video to the media library',
    activeRoute: '/admin/media/videos',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/videos' },
      { label: 'Videos', url: '/admin/media/videos' },
      { label: 'New Video', url: '/admin/media/videos/new' },
    ],
  };
}
