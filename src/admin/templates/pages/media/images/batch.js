// Batch image upload page template

/**
 * Batch image upload page inner content (layout applied via fastify-html addLayout).
 */
export function imagesBatchContent({ user, albums }) {
  return `
    <div class="media">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Batch Upload Images</h1>
            <p class="page-header__subtitle">Upload up to 20 images at once</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <form 
          id="batchUploadForm"
          class="form"
          hx-post="/admin/media/images/batch"
          hx-encoding="multipart/form-data"
          hx-target="#form-response"
          hx-swap="innerHTML"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          
          <div id="form-response"></div>

          <!-- Upload Zone -->
          <div class="batch-upload-zone" id="dropZone">
            <input 
              type="file" 
              name="images" 
              id="batchImageInput"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              required
              class="batch-upload-zone__input"
              onchange="handleBatchFileSelect(this)"
            />
            <div class="upload-placeholder" id="uploadPlaceholder">
              <i data-lucide="images" class="upload-placeholder__icon"></i>
              <p>Drag & Drop or Click to Select Images</p>
              <p>Up to 20 images, JPEG, PNG, WebP, GIF up to 50MB each</p>
            </div>
          </div>

          <!-- Batch File List -->
          <div class="table batch-file-list" id="batchFileList">
            <table>
              <thead class="table__thead">
                <tr class="table__tr">
                  <th>Filename</th>
                  <th>Size</th>
                  <th class="table__td--actions">Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody" id="batchFileListBody"></tbody>
            </table>
          </div>

          <!-- Album Selection -->
          <div class="batch-album-section">
            <label class="label" for="batchAlbumId">Album (Optional)</label>
            <select 
              name="albumId" 
              id="batchAlbumId"
              class="form__select-native"
              data-hs-select='{
                "placeholder": "None",
                "toggleClasses": "form__select-toggle",
                "dropdownClasses": "form__select-dropdown",
                "optionClasses": "form__select-option"
              }'
            >
              <option value="">None</option>
              ${albums.map(album => `
                <option value="${album.id}">${album.title}</option>
              `).join('')}
            </select>
          </div>

          <!-- Submit Button -->
          <div class="batch-actions">
            <button type="submit" class="btn btn--primary" id="batchSubmitBtn" disabled>
              <i data-lucide="upload"></i>
              Upload Images
            </button>
            <a href="/admin/media/images" class="btn btn--outline btn--cancel">Cancel</a>
          </div>
        </form>
      </div>
    </div>

    <script>
      let selectedFiles = [];

      function handleBatchFileSelect(input) {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        // Limit to 20 files
        if (files.length > 20) {
          alert('Please select a maximum of 20 images.');
          input.value = '';
          return;
        }

        selectedFiles = files;
        const placeholder = document.getElementById('uploadPlaceholder');
        const fileList = document.getElementById('batchFileList');
        const fileListBody = document.getElementById('batchFileListBody');
        const submitBtn = document.getElementById('batchSubmitBtn');
        const dropZone = document.getElementById('dropZone');

        // Update placeholder with count, show file list
        placeholder.innerHTML = '<p><strong>' + files.length + ' image' + (files.length !== 1 ? 's' : '') + ' selected</strong></p><p>Click to add more images</p>';
        placeholder.classList.add('upload-placeholder--compact');
        fileList.classList.add('batch-file-list--visible');
        submitBtn.disabled = false;
        dropZone.classList.add('batch-upload-zone--has-files');

        // Format file size
        function formatFileSize(bytes) {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        // Build file list rows with existing table component classes
        fileListBody.innerHTML = files.map((file, index) => {
          return '<tr class="table__tr">' +
            '<td class="table__td">' +
              '<span class="table__label">Filename</span>' +
              '<span class="table__title">' + file.name + '</span>' +
            '</td>' +
            '<td class="table__td">' +
              '<span class="table__label">Size</span>' +
              '<span>' + formatFileSize(file.size) + '</span>' +
            '</td>' +
            '<td class="table__td table__td--actions">' +
              '<div class="row-actions">' +
              '<button type="button" class="btn btn--ghost" onclick="removeBatchImage(' + index + ')" title="Remove">' +
                '<i data-lucide="x"></i>' +
              '</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      function removeBatchImage(index) {
        selectedFiles.splice(index, 1);
        
        if (selectedFiles.length === 0) {
          // Reset to empty state
          document.getElementById('batchImageInput').value = '';
          const placeholder = document.getElementById('uploadPlaceholder');
          placeholder.innerHTML = '<i data-lucide="images" class="upload-placeholder__icon"></i><p>Drag & Drop or Click to Select Images</p><p>Up to 20 images, JPEG, PNG, WebP, GIF up to 50MB each</p>';
          placeholder.classList.remove('upload-placeholder--compact');
          document.getElementById('batchFileList').classList.remove('batch-file-list--visible');
          document.getElementById('batchSubmitBtn').disabled = true;
          document.getElementById('dropZone').classList.remove('batch-upload-zone--has-files');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        } else {
          // Refresh file list
          const input = document.getElementById('batchImageInput');
          const dt = new DataTransfer();
          selectedFiles.forEach(file => dt.items.add(file));
          input.files = dt.files;
          handleBatchFileSelect(input);
        }
      }

      // Drag and drop
      const dropZone = document.getElementById('dropZone');
      
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('batch-upload-zone--dragover');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('batch-upload-zone--dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('batch-upload-zone--dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const input = document.getElementById('batchImageInput');
          input.files = files;
          handleBatchFileSelect(input);
        }
      });
    </script>
  `;
}

export function imagesBatchMeta() {
  return {
    title: 'Batch Upload Images',
    description: 'Upload multiple images at once',
    activeRoute: '/admin/media/images',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Images', url: '/admin/media/images' },
      { label: 'Batch Upload', url: '/admin/media/images/batch' },
    ],
  };
}
