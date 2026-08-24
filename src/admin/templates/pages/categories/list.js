// src/admin/templates/pages/categories/list.js
// Categories List Page - Refactored with list-toolbar partial

import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, paginationHtml, toastQueryScript } from '../../utils/helpers.js';



/**
 * Categories list page inner content (layout applied via fastify-html addLayout).
 */
export function categoriesListContent({ categories, total, page, totalPages, filters, user, toast }) {
  const toastScript = toastQueryScript(toast, {
    created: 'Category created successfully!',
    deleted: 'Category deleted successfully!',
  });

  const content = `
    <div class="categories">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Categories</h1>
            <p class="page-header__subtitle">Manage your categories</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchUrl: '/admin/categories',
          searchTarget: '#categories-table-container',
          searchPlaceholder: 'Search categories...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/categories/new',
          addButtonText: categories.length === 0 ? 'Create First Category' : 'New Category',
        })}

        <div id="categories-table-container" class="categories__table-content">
        ${
          categories.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
              <thead class="table__thead">
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody">
                ${categories
                  .map(
                    (category) => `
                  <tr class="table__tr">
                    <td class="table__td">
                      <span class="table__label">Title</span>
                      <div class="table__title">
                        <a href="/admin/categories/${category.id}/edit">${escapeHtml(category.title)}</a>
                      </div>
                    </td>

                    <td class="table__td">
                      <span class="table__label">Slug</span>
                      <div>${category.slug}</div>
                    </td>

                    <td class="table__td">
                      <span class="table__label">Description</span>
                      <div class="table__title">${category.description || '-'}</div>
                    </td>

                    <td class="table__td">
                      <span class="table__label">Date</span>
                      ${formatDate(category.createdAt)}
                    </td>

                    <td class="table__td table__td--actions">
                      <div class="row-actions">
                        <a href="/admin/categories/${category.id}/edit" class="btn btn--ghost row-action row-action--edit">
                          <i data-lucide="pencil"></i>
                          <span>Edit</span>
                        </a>
                        <button
                          type="button"
                          class="btn btn--ghost row-action row-action--delete"
                          data-category-id="${category.id}"
                          data-category-title="${escapeHtml(category.title)}"
                          data-post-count="${category.postCount || 0}"
                          onclick="openDeleteModal(this)"
                        >
                          <i data-lucide="trash-2"></i>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
        `}
        </div>

        ${totalPages > 1 ? paginationHtml({ basePath: '/admin/categories', page, totalPages, filters, filterKeys: ['search'] }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return content;
}

/** Delete modal HTML for categories list page */
export function categoriesListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Category',
    entityLabel: 'title',
    deleteUrlPath: '/admin/categories',
    csrfToken: user?.csrfToken || '',
    hasConditionalMessage: true,
    conditionalConfig: {
      messageWithItems: 'The {name} category has {count} post(s). They will be moved to Uncategorized.',
      messageWithoutItems: 'This action cannot be undone. The {name} category will be permanently deleted.',
      countAttribute: 'data-post-count'
    }
  });

  return deleteModal.render();
}

/** Page metadata for categories list */
export function categoriesListMeta({ user }) {
  return {
    title: 'Categories',
    description: 'Manage your blog categories',
    activeRoute: '/admin/categories',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Categories', url: '/admin/categories' },
    ],
    modals: categoriesListModals({ user }),
  };
}

/** HTMX table fragment for categories list */
export function categoriesTableFragment({ categories, pagination, counts }) {
  if (!categories || categories.length === 0) {
    return `
      <div class="empty">
        <h3>No categories found</h3>
        <p>Get started by creating your first category.</p>
      </div>
    `;
  }

  const rows = categories.map((category) => {
    const date = new Date(category.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Title</span>
          <div class="table__title">
            <a href="/admin/categories/${category.id}/edit">${category.title}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${category.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${category.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/categories/${category.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-category-id="${category.id}"
              data-category-title="${category.title}"
              data-post-count="${category.postCount || 0}"
              onclick="openDeleteModal(this)"
            >
              <i data-lucide="trash-2" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const paginationFragment = pagination && pagination.totalPages > 1
    ? paginationHtml({
        basePath: '/admin/categories',
        page: pagination.page,
        totalPages: pagination.totalPages,
        filters: {},
        filterKeys: ['status', 'search'],
      })
    : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Title</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${rows}
      </tbody>
    </table>
    ${paginationFragment}
  `;
}

function emptyState() {
  return `
    <div class="empty">
      <h3>No categories yet</h3>
      <p>Create your first category to organize your posts</p>
    </div>
  `;
}
