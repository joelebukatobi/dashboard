// src/admin/templates/pages/categories/edit.js
// Edit Category Page - Exact structure from edit-category.html

import { escapeHtml } from '../../utils/helpers.js';

/**
 * Edit Category page inner content (layout applied via fastify-html addLayout).
 */
export function categoryEditContent({ category, user, errors = {} }) {
  const content = `
    <div class="categories">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Category</h1>
            <p class="page-header__subtitle">Update category details</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Edit Category Form -->
        <div class="card">
          <div class="card__header">
            <h2>Category Details</h2>
          </div>
        <div class="card__body">
          <form
            class="form"
            id="editCategoryForm"
            novalidate
            hx-put="/admin/categories/${category.id}"
            hx-target="#form-response"
            hx-swap="innerHTML"
          >
            <div id="form-response"></div>

            <!-- Title & Slug Row -->
            <div class="form__row form__row--2col">
              <!-- Title -->
              <div class="form__group ${errors.title ? 'form__group--error' : ''}">
                <label class="label label--required" for="categoryTitle">Title</label>
                <input
                  type="text"
                  class="input"
                  id="categoryTitle"
                  name="title"
                  value="${escapeHtml(category.title)}"
                  required
                />
                ${errors.title ? `<p class="form-feedback form-feedback--error">${errors.title}</p>` : ''}
              </div>
              <!-- Slug -->
              <div class="form__group ${errors.slug ? 'form__group--error' : ''}">
                <label class="label" for="categorySlug">Slug</label>
                <input
                  type="text"
                  class="input"
                  id="categorySlug"
                  name="slug"
                  value="${category.slug}"
                  readonly
                />
                <p class="form-feedback form-feedback--hint">Auto-generated from title. Contact admin to change.</p>
                ${errors.slug ? `<p class="form-feedback form-feedback--error">${errors.slug}</p>` : ''}
              </div>
            </div>

            <!-- Description -->
            <div class="form__group">
              <label class="label" for="categoryDescription">Description</label>
              <textarea
                class="textarea"
                id="categoryDescription"
                name="description"
                rows="4"
              >${escapeHtml(category.description || '')}</textarea>
            </div>

            <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          </form>
        </div>
        <div class="card__footer">
          <div class="form__field-group">
            <button type="button" class="btn btn--primary" onclick="submitForm()">
              Save
            </button>
            <a href="/admin/categories" class="btn btn--outline btn--cancel">Cancel</a>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Submit form using HTMX trigger
      function submitForm() {
        htmx.trigger('#editCategoryForm', 'submit');
      }
    </script>
  `;

  return content;
}

export function categoryEditMeta({ category }) {
  return {
    title: 'Edit Category',
    description: 'Edit category',
    activeRoute: '/admin/categories',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Categories', url: '/admin/categories' },
      { label: category.title, url: `/admin/categories/${category.id}/edit` },
    ],
  };
}
