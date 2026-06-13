// src/admin/templates/pages/tags/edit.js
// Edit Tag Page

import { escapeHtml } from '../../utils/helpers.js';

/**
 * Edit Tag page inner content (layout applied via fastify-html addLayout).
 */
export function tagEditContent({ tag, user, errors = {} }) {
  const content = `
    <div class="tags">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Tag</h1>
            <p class="page-header__subtitle">Update tag details</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Edit Tag Form -->
        <div class="card">
        <div class="card__header">
          <h2>Tag Details</h2>
        </div>
        <div class="card__body">
          <form
            class="form"
            id="editTagForm"
            hx-put="/admin/tags/${tag.id}"
            hx-target="#form-response"
            hx-swap="innerHTML"
          >
            <div id="form-response"></div>

            <!-- Name & Slug Row -->
            <div class="form__row form__row--2col">
              <!-- Name -->
              <div class="form__group ${errors.name ? 'form__group--error' : ''}">
                <label class="label label--required" for="tagName">Name</label>
                <input
                  type="text"
                  class="input"
                  id="tagName"
                  name="name"
                  value="${escapeHtml(tag.name)}"
                  required
                />
                ${errors.name ? `<p class="form-feedback form-feedback--error">${errors.name}</p>` : ''}
              </div>
              <!-- Slug -->
              <div class="form__group ${errors.slug ? 'form__group--error' : ''}">
                <label class="label" for="tagSlug">Slug</label>
                <input
                  type="text"
                  class="input"
                  id="tagSlug"
                  name="slug"
                  value="${tag.slug}"
                  readonly
                />
                <p class="form-feedback form-feedback--hint">Auto-generated from name. Contact admin to change.</p>
                ${errors.slug ? `<p class="form-feedback form-feedback--error">${errors.slug}</p>` : ''}
              </div>
            </div>

            <!-- Description -->
            <div class="form__group">
              <label class="label" for="tagDescription">Description</label>
              <textarea
                class="textarea"
                id="tagDescription"
                name="description"
                rows="4"
              >${escapeHtml(tag.description || '')}</textarea>
            </div>

            <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          </form>
        </div>
        <div class="card__footer">
          <div class="form__field-group">
            <button type="button" class="btn btn--primary" onclick="submitForm()">
              <i data-lucide="check"></i>
              Save
            </button>
            <a href="/admin/tags" class="btn btn--outline btn--cancel">Cancel</a>
          </div>
        </div>
      </div>
    </div>
    </div>

    <script>
      // Submit form using HTMX trigger
      function submitForm() {
        htmx.trigger('#editTagForm', 'submit');
      }
    </script>
  `;

  return content;
}

export function tagEditMeta({ tag }) {
  return {
    title: 'Edit Tag',
    description: 'Edit tag',
    activeRoute: '/admin/tags',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Tags', url: '/admin/tags' },
      { label: tag.name, url: `/admin/tags/${tag.id}/edit` },
    ],
  };
}
