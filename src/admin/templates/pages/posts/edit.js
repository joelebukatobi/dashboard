// src/admin/templates/pages/posts/edit.js
// Edit Post Page - Exact structure from edit-post.html

import { mainLayout } from '../../layouts/main.js';
import { escapeHtml } from '../../utils/helpers.js';

/**
 * Edit Post Page Template
 * Edit existing blog post
 * Structure matches edit-post.html exactly
 */
export function postEditPage({ categories, tags, post, user }) {
  const content = `
    <div class="content content-main">
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header__left">
          <h1 class="page-header__title">Edit Post</h1>
          <p class="page-header__subtitle">Update your blog post</p>
        </div>
        <div class="page-header__toast-container" id="form-response"></div>
      </div>

      <!-- Edit Post Form Container (Scrollable) -->
      <div class="page-main">
        <div class="card">
        <div class="card__header">
          <h2 class="card__title">Post Details</h2>
        </div>
        <div class="card__body">
          <form
            class="form"
            id="editPostForm"
            hx-put="/admin/posts/${post.id}"
            hx-target="#form-response"
            hx-swap="innerHTML"
          >
            <!-- Featured Image -->
            <div class="form__group">
              <label class="label">Featured Image</label>
              <div class="image-upload">
                <div class="image-upload__preview has-image" id="imagePreview">
                  <img src="${post.featuredImageUrl || '/public/uploads/images/featured-posts.jpg'}" alt="Featured image preview" id="previewImg" />
                  <div class="image-upload__dropzone image-upload__dropzone--overlay" id="dropzone">
                    <i data-lucide="image-plus" class="image-upload__icon"></i>
                    <p class="image-upload__text">Click to upload or drag and drop</p>
                    <p class="image-upload__hint">PNG, JPG, WebP up to 10MB</p>
                    <input type="file" id="imageInput" accept="image/*" hidden />
                  </div>
                </div>
              </div>
              <input type="hidden" name="featuredImageId" id="featuredImageId" value="${post.featuredImageId || ''}" />
            </div>

            <!-- Title & Slug Row -->
            <div class="form__row form__row--2col">
              <!-- Title -->
              <div class="form__group">
                <label class="label label--required">Post Title</label>
                <input
                  type="text"
                  class="input"
                  id="postTitle"
                  name="title"
                  placeholder="Enter post title"
                  value="${escapeHtml(post.title)}"
                  required
                />
              </div>

              <!-- Slug -->
              <div class="form__group">
                <label class="label">Slug</label>
                <input
                  type="text"
                  class="input"
                  name="slug"
                  id="postSlug"
                  value="${post.slug}"
                  placeholder="auto-generated-from-title"
                />
                <p class="form-feedback form-feedback--hint">Auto-generated from title. Editable if needed.</p>
              </div>
            </div>

            <!-- Author, Category & Tags Row -->
            <div class="form__row form__row--3col">
              <!-- Author -->
              <div class="form__group">
                <label class="label label--required">Author</label>
                <select
                  name="authorId"
                  id="postAuthor"
                  data-hs-select='{
                    "placeholder": "Select an author...",
                    "toggleClasses": "form__select-toggle",
                    "dropdownClasses": "form__select-dropdown",
                    "optionClasses": "form__select-option"
                  }'
                  class="hidden"
                >
                  <option value="${post.authorId || ''}" selected>${post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Current User'}</option>
                </select>
              </div>

              <!-- Category -->
              <div class="form__group">
                <label class="label label--required">Category</label>
                <select
                  name="categoryId"
                  id="postCategory"
                  data-hs-select='{
                    "placeholder": "Select a category...",
                    "toggleClasses": "form__select-toggle",
                    "dropdownClasses": "form__select-dropdown",
                    "optionClasses": "form__select-option"
                  }'
                  class="hidden"
                >
                  <option value="">Uncategorized</option>
                  ${categories.map((cat) => `
                    <option value="${cat.id}" ${post.categoryId === cat.id ? 'selected' : ''}>${cat.title}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Tags -->
              <div class="form__group">
                <label class="label">Tags</label>
                <select
                  name="tagIds"
                  id="postTags"
                  multiple
                  data-hs-select='{
                    "placeholder": "Select tags...",
                    "toggleClasses": "form__select-toggle",
                    "dropdownClasses": "form__select-dropdown",
                    "optionClasses": "form__select-option"
                  }'
                  class="hidden"
                >
                  ${tags.map((tag) => `
                    <option value="${tag.id}" ${post.tags?.some((t) => t.id === tag.id) ? 'selected' : ''}>${tag.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Short Description -->
            <div class="form__group">
              <label class="label">Short Description</label>
              <textarea
                class="textarea"
                name="excerpt"
                rows="3"
                placeholder="Brief summary of the post (optional)"
              >${escapeHtml(post.excerpt || '')}</textarea>
            </div>

            <!-- Content (Rich Text Editor) -->
            <div class="form__group">
              <label class="label label--required">Content</label>
              <div id="editor" class="post-editor"></div>
              <input type="hidden" name="content" id="contentInput" value="${escapeHtml(post.content)}" />
            </div>

            <input type="hidden" name="status" id="postStatus" value="${post.status}" />
          </form>
        </div>
        <div class="card__footer">
          <div class="form__field-group">
            <button type="button" class="btn btn--primary" onclick="submitForm('PUBLISHED')">
              ${post.status === 'PUBLISHED' ? 'Update Post' : 'Publish Post'}
            </button>
            <button type="button" class="btn btn--outline-primary" onclick="submitForm('DRAFT')">
              Save Draft
            </button>
            <a href="/admin/posts" class="btn btn--ghost btn--cancel">Cancel</a>
          </div>
        </div>
      </div>
    </div>

    <div id="editorMediaModal" class="editor-media-modal hidden" role="dialog" tabindex="-1" aria-hidden="true">
      <div class="editor-media-modal__backdrop" onclick="closeMediaModal()"></div>
      <div class="editor-media-modal__panel">
        <div class="editor-media-modal__header">
          <h3 id="mediaModalTitle">Insert Media</h3>
          <button type="button" class="btn btn--ghost" onclick="closeMediaModal()">Close</button>
        </div>

        <div class="editor-media-modal__toolbar">
          <input id="mediaSearchInput" class="input" type="text" placeholder="Search media..." />
          <button type="button" class="btn btn--outline-primary" onclick="searchMedia()">Search</button>
          <button type="button" class="btn btn--primary" onclick="triggerMediaUpload()">Upload</button>
          <input id="mediaUploadInput" type="file" hidden />
        </div>

        <div id="mediaPickerStatus"></div>
        <div id="mediaPickerGrid" class="editor-media-modal__grid"></div>
      </div>
    </div>
    </div>

    <!-- CKEditor 5 Styles -->
    <link rel="stylesheet" href="https://cdn.ckeditor.com/ckeditor5/43.0.0/ckeditor5.css" />

    <!-- CKEditor 5 JS -->
    <script src="https://cdn.ckeditor.com/ckeditor5/43.0.0/ckeditor5.umd.js"></script>

    <script>
      const { ClassicEditor, Essentials, Bold, Italic, Underline, Strikethrough, Heading,
              List, Link, SourceEditing, Paragraph, BlockQuote, Image, ImageToolbar,
              ImageCaption, ImageStyle, ImageResize, ImageUpload, SimpleUploadAdapter,
              Alignment, SpecialCharacters, MediaEmbed, Code, Plugin, ButtonView } = CKEDITOR;

      const PluginBase = Plugin || class {};
      const ButtonViewBase = ButtonView || null;

      class InsertImagePickerPlugin extends PluginBase {
        init() {
          if (!ButtonViewBase) return;
          const editor = this.editor;
          editor.ui.componentFactory.add('insertImagePicker', (locale) => {
            const view = new ButtonViewBase(locale);
            view.set({
              label: 'Insert image',
              tooltip: 'Insert image',
              withText: false,
              icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm2 .5v9.086l3.293-3.293a1 1 0 0 1 1.414 0L14 15l1.293-1.293a1 1 0 0 1 1.414 0L18 15V6H6Zm4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>'
            });
            view.on('execute', () => openMediaModal('image'));
            return view;
          });
        }
      }

      class InsertVideoPickerPlugin extends PluginBase {
        init() {
          if (!ButtonViewBase) return;
          const editor = this.editor;
          editor.ui.componentFactory.add('insertVideoPicker', (locale) => {
            const view = new ButtonViewBase(locale);
            view.set({
              label: 'Insert video',
              tooltip: 'Insert video',
              withText: false,
              icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.879l2.553-1.532A1 1 0 0 1 20 8.704v6.592a1 1 0 0 1-1.447.857L16 14.621V16.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 16.5v-9Z"/></svg>'
            });
            view.on('execute', () => openMediaModal('video'));
            return view;
          });
        }
      }

      let editor;
      let currentMediaType = 'image';

      const customMediaButtonsEnabled = !!ButtonViewBase;

      // Initialize CKEditor 5
      ClassicEditor
        .create(document.querySelector('#editor'), {
          plugins: [Essentials, Bold, Italic, Underline, Strikethrough, Heading,
                    List, Link, SourceEditing, Paragraph, BlockQuote, Image, ImageToolbar,
                    ImageCaption, ImageStyle, ImageResize, ImageUpload, SimpleUploadAdapter,
                    Alignment, SpecialCharacters, MediaEmbed, Code,
                    ...(customMediaButtonsEnabled ? [InsertImagePickerPlugin, InsertVideoPickerPlugin] : [])],
          toolbar: {
            items: [
              'heading',
              '|',
              'bold', 'italic', 'underline', 'strikethrough',
              '|',
              'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify',
              '|',
              'bulletedList', 'numberedList', 'blockQuote',
              '|',
              'code',
              '|',
              'link',
              ...(customMediaButtonsEnabled ? ['insertImagePicker', 'insertVideoPicker'] : ['imageUpload', 'mediaEmbed']),
              '|',
              'specialCharacters',
              '|',
              'sourceEditing'
            ]
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
              { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
              { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
            ]
          },
          simpleUpload: {
            uploadUrl: '/admin/posts/upload-image'
          },
          mediaEmbed: {
            previewsInData: true,
            providers: [
              {
                name: 'localVideo',
                url: new RegExp('^/public/uploads/videos/(.+)$'),
                html: match => {
                  const videoPath = '/public/uploads/videos/' + match[1];
                  return '<div class="editor-video"><video controls preload="metadata"><source src="' + videoPath + '"></video></div>';
                }
              }
            ]
          },
          image: {
            toolbar: [
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side',
              '|',
              'toggleImageCaption',
              'imageTextAlternative'
            ]
          },
          placeholder: 'Write your post content here...'
        })
        .then(newEditor => {
          editor = newEditor;
          
          // Set initial content
          const initialContent = document.getElementById('contentInput').value;
          if (initialContent) {
            editor.setData(initialContent);
          }
        })
        .catch(error => {
          console.error('CKEditor initialization failed:', error);
        });

      // Submit form
      function submitForm(status) {
        // Update content from CKEditor
        if (editor) {
          document.getElementById('contentInput').value = editor.getData();
        }

        // Set status in hidden field
        document.getElementById('postStatus').value = status;

        // Submit using HTMX trigger
        htmx.trigger('#editPostForm', 'submit');
      }

      function openMediaModal(type) {
        currentMediaType = type;
        document.getElementById('mediaModalTitle').textContent = type === 'video' ? 'Insert Video' : 'Insert Image';
        document.getElementById('mediaUploadInput').accept = type === 'video' ? 'video/*' : 'image/*';

        const modal = document.getElementById('editorMediaModal');
        if (modal && modal.parentElement !== document.body) {
          document.body.appendChild(modal);
        }
        modal.classList.remove('hidden');
        loadMediaItems();
      }

      function closeMediaModal() {
        document.getElementById('editorMediaModal').classList.add('hidden');
        document.getElementById('mediaSearchInput').value = '';
      }

      async function searchMedia() {
        await loadMediaItems(document.getElementById('mediaSearchInput').value);
      }

      async function loadMediaItems(search = '') {
        const statusEl = document.getElementById('mediaPickerStatus');
        const gridEl = document.getElementById('mediaPickerGrid');
        statusEl.textContent = 'Loading media...';
        gridEl.innerHTML = '';

        const endpoint = currentMediaType === 'video' ? '/admin/posts/media/videos' : '/admin/posts/media/images';

        try {
          const response = await fetch(endpoint + '?limit=24&search=' + encodeURIComponent(search));
          const data = await response.json();
          const items = data.items || [];

          if (!items.length) {
            statusEl.textContent = 'No media found.';
            return;
          }

          statusEl.textContent = 'Select an item to insert.';

          gridEl.innerHTML = items.map((item) => {
            const preview = item.thumbnailUrl || item.url;
            const title = item.title || 'Untitled';
            return '<button type="button" class="editor-media-modal__item" onclick="insertMedia(' + "'" + item.id + "'" + ')"><div class="editor-media-modal__item-preview">' + (currentMediaType === 'video'
                    ? '<img src="' + preview + '" alt="' + title.replace(/"/g, '&quot;') + '" />'
                    : '<img src="' + preview + '" alt="' + title.replace(/"/g, '&quot;') + '" />') +
                '</div><p>' + title + '</p></button>';
          }).join('');

          window.__editorMediaItems = items;
        } catch (error) {
          statusEl.textContent = 'Failed to load media.';
        }
      }

      function insertMedia(id) {
        if (!editor || !window.__editorMediaItems) return;
        const item = window.__editorMediaItems.find((mediaItem) => mediaItem.id === id);
        if (!item) return;

        if (currentMediaType === 'video') {
          editor.execute('mediaEmbed', { url: item.url });
        } else {
          editor.execute('insertImage', {
            source: item.url,
            alt: item.altText || item.title || ''
          });
        }

        closeMediaModal();
      }

      function triggerMediaUpload() {
        document.getElementById('mediaUploadInput').click();
      }

      document.getElementById('mediaUploadInput')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const statusEl = document.getElementById('mediaPickerStatus');
        statusEl.textContent = currentMediaType === 'video' ? 'Uploading and processing video...' : 'Uploading image...';

        const formData = new FormData();
        formData.append(currentMediaType === 'video' ? 'video' : 'image', file);

        const endpoint = currentMediaType === 'video' ? '/admin/posts/upload-video' : '/admin/posts/upload-image';

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const item = await response.json();
          if (currentMediaType === 'video') {
            editor.execute('mediaEmbed', { url: item.url });
          } else {
            editor.execute('insertImage', {
              source: item.url,
              alt: item.title || '',
            });
          }

          statusEl.textContent = 'Inserted into editor.';
          await loadMediaItems();
          e.target.value = '';
        } catch (error) {
          statusEl.textContent = 'Upload failed. Please try again.';
        }
      });

      // Image upload handling
      const dropzone = document.getElementById('dropzone');
      const imageInput = document.getElementById('imageInput');
      const previewImg = document.getElementById('previewImg');
      const featuredImageId = document.getElementById('featuredImageId');

      // Handle click on overlay
      dropzone?.addEventListener('click', () => imageInput.click());

      imageInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
          const response = await fetch('/admin/posts/upload-image', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            previewImg.src = data.url;
            featuredImageId.value = data.id;
            lucide.createIcons();
          }
        } catch (error) {
          console.error('Upload failed:', error);
        }
      });
    </script>
  `;

  return mainLayout({
    title: 'Edit Post',
    description: 'Edit blog post',
    content,
    user,
    activeRoute: '/admin/posts',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Blog Posts', url: '/admin/posts' },
      { label: post.title.substring(0, 30) + (post.title.length > 30 ? '...' : ''), url: `/admin/posts/${post.id}/edit` }
    ]
  });
}
