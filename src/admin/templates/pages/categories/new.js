// src/admin/templates/pages/categories/new.js
// New Category Page - Exact structure from new-category.html

import { mainLayout } from '../../layouts/main.js';

/**
 * New Category Page Template
 * Create new category
 * Structure matches new-category.html exactly
 */
export function categoryNewPage({ user, errors = {} }) {
  const content = `
    <div class="categories">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">New Category</h1>
            <p class="page-header__subtitle">Create a new category for your posts</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- New Category Form -->
        <div class="card">
          <div class="card__header">
            <h2>Category Details</h2>
          </div>
        <div class="card__body">
          <form
            class="form"
            id="newCategoryForm"
            hx-post="/admin/categories"
            hx-target="#form-response"
            hx-swap="innerHTML"
          >
            <div id="form-response"></div>

            <!-- Title & Slug Row -->
            <div class="form__row form__row--2col">
              <!-- Title -->
              <div class="form__group ${errors.title ? 'form__group--error' : ''}">
                <label class="label label--required">Title</label>
                <input
                  type="text"
                  class="input"
                  id="categoryTitle"
                  name="title"
                  placeholder="e.g. Development"
                  required
                />
                ${errors.title ? `<p class="form-feedback form-feedback--error">${errors.title}</p>` : ''}
              </div>
              <!-- Slug -->
              <div class="form__group ${errors.slug ? 'form__group--error' : ''}">
                <label class="label">Slug</label>
                <input
                  type="text"
                  class="input"
                  id="categorySlug"
                  name="slug"
                  placeholder="e.g. development"
                />
                <p class="form-feedback form-feedback--hint">Leave blank to generate from title</p>
                ${errors.slug ? `<p class="form-feedback form-feedback--error">${errors.slug}</p>` : ''}
              </div>
            </div>

            <!-- Description -->
            <div class="form__group">
              <label class="label">Description</label>
              <textarea
                class="textarea"
                id="categoryDescription"
                name="description"
                rows="4"
                placeholder="Enter category description..."
              ></textarea>
            </div>

            <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          </form>
        </div>
        <div class="card__footer">
          <div class="form__field-group">
            <button type="button" class="btn btn--primary" onclick="submitForm()">
              Create Category
            </button>
            <a href="/admin/categories" class="btn btn--ghost btn--cancel">Cancel</a>
          </div>
        </div>
      </div>
    </div>
    </div>

    <script>
      // Auto-generate slug from title
      const titleInput = document.getElementById('categoryTitle');
      const slugInput = document.getElementById('categorySlug');

      titleInput?.addEventListener('blur', () => {
        if (!slugInput.value && titleInput.value) {
          const slug = titleInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          slugInput.value = slug;
        }
      });

      // Submit form using HTMX trigger
      function submitForm() {
        htmx.trigger('#newCategoryForm', 'submit');
      }
    </script>
  `;

  return mainLayout({
    title: 'New Category',
    description: 'Create a new category',
    content,
    user,
    activeRoute: '/admin/categories',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Categories', url: '/admin/categories' },
      { label: 'New Category', url: '/admin/categories/new' }
    ]
  });
}
