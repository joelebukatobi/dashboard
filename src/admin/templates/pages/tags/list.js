// src/admin/templates/pages/tags/list.js
// Tags List Page - Refactored with list-toolbar partial

import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, paginationHtml, toastQueryScript } from '../../utils/helpers.js';



/**
 * Tags list page inner content (layout applied via fastify-html addLayout).
 */
export function tagsListContent({ tags, total, page, totalPages, filters, user, toast }) {
  const toastScript = toastQueryScript(toast, {
    created: 'Tag created successfully!',
    deleted: 'Tag deleted successfully!',
  });

  const content = `
    <div class="tags">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Tags</h1>
            <p class="page-header__subtitle">Manage your tags</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchUrl: '/admin/tags',
          searchTarget: '#tags-table-container',
          searchPlaceholder: 'Search tags...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/tags/new',
          addButtonText: tags.length === 0 ? 'Create First Tag' : 'New Tag',
        })}

        <div id="tags-table-container" class="tags__table-content">
        ${
          tags.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
              <thead class="table__thead">
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Posts</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody">
                ${tags
                  .map(
                    (tag) => `
                  <tr class="table__tr">
                    <td class="table__td">
                      <span class="table__label">Name</span>
                      <div class="table__title">
                        <a href="/admin/tags/${tag.id}/edit">${escapeHtml(tag.name)}</a>
                      </div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Slug</span>
                      <div>${tag.slug}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Description</span>
                      <div>${tag.description || '-'}</div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Posts</span>
                      <span class="badge badge--neutral">${tag.postCount || 0}</span>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Date</span>
                      ${formatDate(tag.createdAt)}
                    </td>
                    <td class="table__td table__td--actions">
                      <div class="row-actions">
                        <a href="/admin/tags/${tag.id}/edit" class="btn btn--ghost row-action row-action--edit">
                          <i data-lucide="pencil"></i>
                          <span>Edit</span>
                        </a>
                        <button
                          type="button"
                          class="btn btn--ghost row-action row-action--delete"
                          data-tag-id="${tag.id}"
                          data-tag-name="${escapeHtml(tag.name)}"
                          data-post-count="${tag.postCount || 0}"
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

        ${totalPages > 1 ? paginationHtml({ basePath: '/admin/tags', page, totalPages, filters, filterKeys: ['search'] }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return content;
}

/** Delete modal HTML for tags list page */
export function tagsListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Tag',
    entityLabel: 'name',
    deleteUrlPath: '/admin/tags',
    csrfToken: user?.csrfToken || '',
    hasConditionalMessage: true,
    conditionalConfig: {
      messageWithItems: 'The {name} tag has {count} post(s). They will be affected.',
      messageWithoutItems: 'This action cannot be undone. The {name} tag will be permanently deleted.',
      countAttribute: 'data-post-count'
    }
  });

  return deleteModal.render();
}

/** Page metadata for tags list */
export function tagsListMeta({ user }) {
  return {
    title: 'Tags',
    description: 'Manage your blog tags',
    activeRoute: '/admin/tags',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Tags', url: '/admin/tags' },
    ],
    modals: tagsListModals({ user }),
  };
}

/** HTMX table fragment for tags list */
export function tagsTableFragment({ tags, pagination }) {
  if (!tags || tags.length === 0) {
    return `
      <div class="empty">
        <h3>No tags found</h3>
        <p>Get started by creating your first tag.</p>
      </div>
    `;
  }

  const rows = tags.map((tag) => {
    const date = new Date(tag.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Name</span>
          <div class="table__title">
            <a href="/admin/tags/${tag.id}/edit">${tag.name}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${tag.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${tag.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Posts</span>
          <span class="badge badge--neutral">${tag.postCount || 0}</span>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/tags/${tag.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-tag-id="${tag.id}"
              data-tag-name="${tag.name}"
              data-post-count="${tag.postCount || 0}"
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

  // Build pagination for the fragment
  const paginationFragment = pagination && pagination.totalPages > 1
    ? paginationHtml({
        basePath: '/admin/tags',
        page: pagination.page,
        totalPages: pagination.totalPages,
        filters: {},
        filterKeys: ['search'],
      })
    : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Posts</th>
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
      <h3>No tags yet</h3>
      <p>Create your first tag to organize your posts</p>
    </div>
  `;
}
