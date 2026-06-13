import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, POST_STATUS_LABELS, paginationHtml, toastQueryScript } from '../../utils/helpers.js';

const POST_FILTER_KEYS = ['search', 'status', { filter: 'categoryId', param: 'category' }];



/**
 * Posts list page inner content (layout applied via fastify-html addLayout).
 */
export function postsListContent({ posts, total, page, totalPages, categories, filters, user, toast }) {
  const toastScript = toastQueryScript(toast, {
    deleted: 'Post deleted successfully!',
  });

  // Build filters array for toolbar
  const toolbarFilters = [
    {
      label: filters.status ? POST_STATUS_LABELS[filters.status] : 'Status',
      options: [
        { url: '/admin/posts', label: 'All Statuses', active: !filters.status },
        { url: '/admin/posts?status=PUBLISHED', label: 'Published', active: filters.status === 'PUBLISHED' },
        { url: '/admin/posts?status=DRAFT', label: 'Draft', active: filters.status === 'DRAFT' },
        { url: '/admin/posts?status=SCHEDULED', label: 'Scheduled', active: filters.status === 'SCHEDULED' },
        { url: '/admin/posts?status=ARCHIVED', label: 'Archived', active: filters.status === 'ARCHIVED' },
      ],
    },
    {
      label: filters.categoryId ? categories.find((c) => c.id === filters.categoryId)?.title : 'Category',
      options: [
        { url: '/admin/posts', label: 'All Categories', active: !filters.categoryId },
        ...categories.map((cat) => ({
          url: `/admin/posts?category=${cat.id}`,
          label: cat.title,
          active: filters.categoryId === cat.id,
        })),
      ],
    },
  ];

  const content = `
    <div class="posts">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Blog Posts</h1>
            <p class="page-header__subtitle">Manage your blog posts</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchUrl: '/admin/posts',
          searchTarget: '#posts-table-container',
          searchPlaceholder: 'Search posts...',
          searchValue: filters.search || '',
          filters: toolbarFilters,
          hasAddButton: true,
          addButtonUrl: '/admin/posts/new',
          addButtonText: 'New Post',
        })}

        <div id="posts-table-container" class="posts__table-content">
        ${
          posts.length === 0
            ? emptyState()
            : `
          <!-- Data List (Table) -->
          <table class="table">
             <thead class="table__thead">
               <tr>
                 <th>Title</th>
                 <th>Category</th>
                 <th>Status</th>
                 <th>Comments</th>
                 <th>Date</th>
                 <th>Actions</th>
               </tr>
             </thead>
            <tbody class="table__tbody">
              ${posts
                .map(
                  (post) => `
                <tr class="table__tr">
                  <td class="table__td">
                    <span class="table__label">Title</span>
                    <div class="table__title">
                      <a href="/admin/posts/${post.id}/edit">${escapeHtml(post.title)}</a>
                    </div>
                  </td>
                   <td class="table__td">
                     <span class="table__label">Category</span>
                     ${post.category ? `<span>${post.category.title}</span>` : '<span>Uncategorized</span>'}
                   </td>
                    <td class="table__td">
                      <span class="table__label">Status</span>
                      ${getStatusBadge(post.status)}
                    </td>
                   <td class="table__td">
                     <span class="table__label">Comments</span>
                     <a href="/admin/posts/${post.id}/comments" class="table__comments-link">
                       <i data-lucide="message-circle"></i>
                       <span>${post.commentsCount || 0}</span>
                     </a>
                   </td>
                   <td class="table__td">
                     <span class="table__label">Date</span>
                     ${formatDate(post.publishedAt || post.createdAt)}
                   </td>
                  <td class="table__td table__td--actions">
                     <div class="row-actions">
                       <a href="/admin/posts/${post.id}/edit" class="btn btn--ghost row-action row-action--edit">
                         <i data-lucide="pencil"></i>
                         <span>Edit</span>
                       </a>
                       <button
                         type="button"
                         class="btn btn--ghost row-action row-action--delete"
                         data-post-id="${post.id}"
                         data-post-title="${escapeHtml(post.title)}"
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

        ${totalPages > 1 ? paginationHtml({ basePath: '/admin/posts', page, totalPages, filters, filterKeys: POST_FILTER_KEYS }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return content;
}

/** Delete modal HTML for posts list page */
export function postsListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Post',
    entityLabel: 'title',
    deleteUrlPath: '/admin/posts',
    targetSelector: '.posts__table-content',
    csrfToken: user?.csrfToken || '',
  });

  return deleteModal.render();
}

/** Page metadata for posts list */
export function postsListMeta({ user }) {
  return {
    title: 'Blog Posts',
    description: 'Manage your blog posts',
    activeRoute: '/admin/posts',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Blog Posts', url: '/admin/posts' },
    ],
    modals: postsListModals({ user }),
  };
}

// Posts table fragment for HTMX partial responses (search, filters)
export function postsTableFragment({ posts, page, totalPages, filters }) {
  if (!posts || posts.length === 0) {
    return `
      <div class="empty">
        <h3>No posts found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
  }

  const rows = posts.map((post) => {
    const statusConfig = {
      PUBLISHED: { class: 'status--success', label: 'Published' },
      DRAFT: { class: 'status--warning', label: 'Draft' },
      SCHEDULED: { class: 'status--info', label: 'Scheduled' },
      ARCHIVED: { class: 'status--neutral', label: 'Archived' },
    };
    const config = statusConfig[post.status] || statusConfig['DRAFT'];
    const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Title</span>
          <div class="table__title">
            <a href="/admin/posts/${post.id}/edit">${escapeHtmlHelper(post.title)}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Category</span>
          ${post.category ? `<span class="text-grey-700">${post.category.title}</span>` : '<span class="text-grey-500">Uncategorized</span>'}
        </td>
        <td class="table__td">
          <span class="table__label">Status</span>
          <span class="status ${config.class}">
            <span class="status__dot"></span>
            ${config.label}
          </span>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/posts/${post.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button 
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-post-id="${post.id}"
              data-post-title="${escapeHtmlHelper(post.title)}"
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
  const paginationFragment = totalPages > 1
    ? paginationHtml({ basePath: '/admin/posts', page, totalPages, filters, filterKeys: POST_FILTER_KEYS })
    : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Status</th>
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

function escapeHtmlHelper(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper Functions

function emptyState() {
  return `
    <div class="empty">
      <h3>No posts yet</h3>
      <p>Create your first post to start sharing your stories</p>
    </div>
  `;
}

function getStatusBadge(status) {
  const statusConfig = {
    PUBLISHED: { class: 'badge--success', label: 'Published' },
    DRAFT: { class: 'badge--warning', label: 'Draft' },
    SCHEDULED: { class: 'badge--info', label: 'Scheduled' },
    ARCHIVED: { class: 'badge--neutral', label: 'Archived' },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  return `<span class="badge ${config.class}">${config.label}</span>`;
}
