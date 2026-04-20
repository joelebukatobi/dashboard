// src/admin/templates/pages/tags/new.js
// New Tag Page

import { mainLayout } from '../../layouts/main.js';

/**
 * New Tag Page Template
 * Create new tag
 */
export function tagNewPage({ user, errors = {} }) {
  const content = `
    <div class="tags">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">New Tag</h1>
            <p class="page-header__subtitle">Create a new tag for your posts</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- New Tag Form -->
        <div class="card">
        <div class="card__header">
          <h2>Tag Details</h2>
        </div>
        <div class="card__body">
          <form
            class="form"
            id="newTagForm"
            hx-post="/admin/tags"
            hx-target="#form-response"
            hx-swap="innerHTML"
          >
            <div id="form-response"></div>

            <!-- Name & Slug Row -->
            <div class="form__row form__row--2col">
              <!-- Name -->
              <div class="form__group ${errors.name ? 'form__group--error' : ''}">
                <label class="label label--required">Name</label>
                <input
                  type="text"
                  class="input"
                  id="tagName"
                  name="name"
                  placeholder="e.g. JavaScript"
                  required
                />
                ${errors.name ? `<p class="form-feedback form-feedback--error">${errors.name}</p>` : ''}
              </div>
              <!-- Slug -->
              <div class="form__group ${errors.slug ? 'form__group--error' : ''}">
                <label class="label">Slug</label>
                <input
                  type="text"
                  class="input"
                  id="tagSlug"
                  name="slug"
                  placeholder="e.g. javascript"
                />
                <p class="form-feedback form-feedback--hint">Leave blank to generate from name</p>
                ${errors.slug ? `<p class="form-feedback form-feedback--error">${errors.slug}</p>` : ''}
              </div>
            </div>

            <!-- Description -->
            <div class="form__group">
              <label class="label">Description</label>
              <textarea
                class="textarea"
                id="tagDescription"
                name="description"
                rows="4"
                placeholder="Enter tag description..."
              ></textarea>
            </div>

            <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          </form>
        </div>
        <div class="card__footer">
          <div class="form__field-group">
            <button type="button" class="btn btn--primary" onclick="submitForm()">
              <i data-lucide="plus"></i>
              Create Tag
            </button>
            <a href="/admin/tags" class="btn btn--ghost btn--cancel">Cancel</a>
          </div>
        </div>
      </div>
    </div>
    </div>

    <script>
      // Auto-generate slug from name
      const nameInput = document.getElementById('tagName');
      const slugInput = document.getElementById('tagSlug');

      nameInput?.addEventListener('blur', () => {
        if (!slugInput.value && nameInput.value) {
          const slug = nameInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          slugInput.value = slug;
        }
      });

      // Submit form using HTMX trigger
      function submitForm() {
        htmx.trigger('#newTagForm', 'submit');
      }
    </script>
  `;

  return mainLayout({
    title: 'New Tag',
    description: 'Create a new tag',
    content,
    user,
    activeRoute: '/admin/tags',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Tags', url: '/admin/tags' },
      { label: 'New Tag', url: '/admin/tags/new' }
    ]
  });
}
