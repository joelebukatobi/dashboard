// src/admin/templates/pages/albums/new.js
// New Album Page

/**
 * New album page inner content (layout applied via fastify-html addLayout).
 */
export function albumNewContent({ user }) {
  return `
    <div class="albums">
      <div class="content">
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">New Album</h1>
            <p class="page-header__subtitle">Create a new album to organize media</p>
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
              id="newAlbumForm"
              hx-post="/admin/media/albums"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div id="form-response"></div>

              <div class="form__row form__row--2col">
                <div class="form__group">
                  <label class="label label--required" for="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    class="input"
                    placeholder="e.g. Cultural Night 2025"
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
                    placeholder="auto-generated-from-title"
                  />
                  <p class="form-feedback form-feedback--hint">Leave blank to generate from title</p>
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
                ></textarea>
              </div>

              <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
            </form>
          </div>
          <div class="card__footer">
            <div class="form__field-group">
              <button type="button" class="btn btn--primary" onclick="submitForm()">
                <i data-lucide="plus"></i>
                Create Album
              </button>
              <a href="/admin/media/albums" class="btn btn--outline btn--cancel">Cancel</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      const titleInput = document.getElementById('title');
      const slugInput = document.getElementById('slug');

      titleInput?.addEventListener('blur', () => {
        if (!slugInput.value && titleInput.value) {
          const slug = titleInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          slugInput.value = slug;
        }
      });

      function submitForm() {
        htmx.trigger('#newAlbumForm', 'submit');
      }
    </script>
  `;
}

export function albumNewMeta() {
  return {
    title: 'New Album',
    description: 'Create a new album',
    activeRoute: '/admin/media/albums',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Media', url: '/admin/media/images' },
      { label: 'Albums', url: '/admin/media/albums' },
      { label: 'New Album', url: '/admin/media/albums/new' },
    ],
  };
}
