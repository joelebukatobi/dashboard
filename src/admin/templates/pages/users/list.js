// src/admin/templates/pages/users/list.js
// Users List Page - Refactored with list-toolbar partial

import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, formatRelativeTime, USER_ROLE_LABELS, USER_STATUS_LABELS, paginationHtml as buildPaginationHtml, toastQueryScript } from '../../utils/helpers.js';

const USER_FILTER_KEYS = ['search', 'role', 'status'];



/**
 * Users list page inner content (layout applied via fastify-html addLayout).
 */
export function usersListContent({ users, pagination, counts, filters, user, toast }) {
  const { total, page, totalPages, limit } = pagination;
  const { roleCounts = {}, statusCounts = {} } = counts || {};

  const toastScript = toastQueryScript(toast, {
    created: 'User created successfully!',
    updated: 'User updated successfully!',
    deleted: 'User deleted successfully!',
    suspended: 'User suspended successfully!',
    activated: 'User activated successfully!',
    'invite-resent': 'Invitation resent successfully!',
  });

  // Build filters array for toolbar
  const toolbarFilters = [
    {
      label: filters.role ? USER_ROLE_LABELS[filters.role] : 'Role',
      options: [
        { url: `/admin/users${filters.status ? '?status=' + filters.status : ''}`, label: 'All Roles', active: !filters.role },
        { url: `/admin/users?role=ADMIN${filters.status ? '&status=' + filters.status : ''}`, label: 'Admin', active: filters.role === 'ADMIN' },
        { url: `/admin/users?role=EDITOR${filters.status ? '&status=' + filters.status : ''}`, label: 'Editor', active: filters.role === 'EDITOR' },
        { url: `/admin/users?role=AUTHOR${filters.status ? '&status=' + filters.status : ''}`, label: 'Author', active: filters.role === 'AUTHOR' },
        { url: `/admin/users?role=VIEWER${filters.status ? '&status=' + filters.status : ''}`, label: 'Viewer', active: filters.role === 'VIEWER' },
      ],
    },
    {
      label: filters.status ? USER_STATUS_LABELS[filters.status] : 'Status',
      options: [
        { url: `/admin/users${filters.role ? '?role=' + filters.role : ''}`, label: 'All Statuses', active: !filters.status },
        { url: `/admin/users?status=ACTIVE${filters.role ? '&role=' + filters.role : ''}`, label: 'Active', active: filters.status === 'ACTIVE' },
        { url: `/admin/users?status=INVITED${filters.role ? '&role=' + filters.role : ''}`, label: 'Invited', active: filters.status === 'INVITED' },
        { url: `/admin/users?status=SUSPENDED${filters.role ? '&role=' + filters.role : ''}`, label: 'Suspended', active: filters.status === 'SUSPENDED' },
      ],
    },
  ];

  const content = `
    <div class="users">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Users</h1>
            <p class="page-header__subtitle">Manage team members and permissions</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchUrl: '/admin/users',
          searchTarget: '#users-table-container',
          searchPlaceholder: 'Search users...',
          searchValue: filters.search || '',
          filters: toolbarFilters,
          hasAddButton: true,
          addButtonUrl: '/admin/users/new',
          addButtonText: 'Add User',
        })}

        <div id="users-table-container" class="users__table-content">
        ${
          users.length === 0
            ? emptyState()
            : `
          <!-- Users Table -->
          <div class="table">
            <table class="table__table">
              <thead class="table__thead">
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date Joined</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="table__tbody">
                ${users
                  .map(
                    (u) => `
                  <tr class="table__tr ${u.status === 'SUSPENDED' ? 'table__tr--muted' : ''}">
                    <td class="table__td">
                      <span class="table__label">User</span>
                      <div class="table__title">
                        <a href="/admin/users/${u.id}/edit">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</a>
                      </div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Role</span>
                      <span class="text-grey-900 dark:text-grey-100">${USER_ROLE_LABELS[u.role] || u.role}</span>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Status</span>
                      <span class="badge badge--${getStatusClass(u.status)}">${u.status}</span>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Date Joined</span>
                      ${formatDate(u.createdAt)}
                    </td>
                    <td class="table__td">
                      <span class="table__label">Last Active</span>
                      ${u.lastActiveAt ? formatRelativeTime(u.lastActiveAt) : 'Never'}
                    </td>
                    <td class="table__td table__td--actions">
                      <div class="row-actions">
                        ${u.status === 'INVITED'
                          ? `<button
                              type="button"
                              class="btn btn--ghost row-action row-action--resend"
                              hx-post="/admin/users/${u.id}/resend-invite"
                              hx-target="#users-table-container"
                              hx-swap="outerHTML"
                              title="Resend Invite"
                            >
                              <i data-lucide="send"></i>
                              <span>Resend</span>
                            </button>`
                          : u.status === 'SUSPENDED'
                            ? `<button
                                type="button"
                                class="btn btn--ghost row-action row-action--activate"
                                hx-post="/admin/users/${u.id}/activate"
                                hx-target="#users-table-container"
                                hx-swap="outerHTML"
                                title="Activate"
                              >
                                <i data-lucide="user-check"></i>
                                <span>Activate</span>
                              </button>`
                            : `<a href="/admin/users/${u.id}/edit" class="btn btn--ghost row-action row-action--edit">
                                <i data-lucide="pencil"></i>
                                <span>Edit</span>
                              </a>`
                        }
                        <button
                          type="button"
                          class="btn btn--ghost row-action row-action--delete"
                          data-user-id="${u.id}"
                          data-user-name="${escapeHtml(u.firstName + ' ' + u.lastName)}"
                          data-user-role="${u.role}"
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
          </div>

          ${totalPages > 1 ? buildPaginationHtml({ basePath: '/admin/users', page, totalPages, filters, filterKeys: USER_FILTER_KEYS }) : ''}
        `
        }
        </div>
      </div>
    </div>

    ${toastScript}
  `;

  return content;
}

/** Delete modal HTML for users list page */
export function usersListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'User',
    entityLabel: 'name',
    deleteUrlPath: '/admin/users',
    csrfToken: user?.csrfToken || '',
    title: 'Remove User?'
  });

  return deleteModal.render();
}

/** Page metadata for users list */
export function usersListMeta({ user }) {
  return {
    title: 'Users',
    description: 'Manage team members and permissions',
    activeRoute: '/admin/users',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Users', url: '/admin/users' },
    ],
    modals: usersListModals({ user }),
  };
}

/**
 * Generate users table HTML fragment for HTMX updates
 * Matches the structure in users/list.js exactly
 */
export function usersTableFragment({ users, total, page, totalPages, limit, filters = {} }) {
  if (!users || users.length === 0) {
    return `
      <div class="empty">
        <h3>No users found</h3>
        <p>Get started by inviting your first team member to collaborate on your blog.</p>
      </div>
    `;
  }

  const USER_ROLE_LABELS = {
    ADMIN: 'Admin',
    EDITOR: 'Editor',
    AUTHOR: 'Author',
    VIEWER: 'Viewer',
  };

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatRelativeTime(date) {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) return formatDate(date);
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  }

  function getStatusClass(status) {
    const classes = {
      ACTIVE: 'success',
      INVITED: 'warning',
      SUSPENDED: 'neutral',
    };
    return classes[status] || 'neutral';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const rows = users.map((u) => `
    <tr class="table__tr ${u.status === 'SUSPENDED' ? 'table__tr--muted' : ''}">
      <td class="table__td">
        <span class="table__label">User</span>
        <div class="table__title">
          <a href="/admin/users/${u.id}/edit">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</a>
        </div>
      </td>
      <td class="table__td">
        <span class="table__label">Role</span>
        <span class="text-grey-900 dark:text-grey-100">${USER_ROLE_LABELS[u.role] || u.role}</span>
      </td>
      <td class="table__td">
        <span class="table__label">Status</span>
        <span class="badge badge--${getStatusClass(u.status)}">${u.status}</span>
      </td>
      <td class="table__td">
        <span class="table__label">Date Joined</span>
        ${formatDate(u.createdAt)}
      </td>
      <td class="table__td">
        <span class="table__label">Last Active</span>
        ${u.lastActiveAt ? formatRelativeTime(u.lastActiveAt) : 'Never'}
      </td>
      <td class="table__td table__td--actions">
        <div class="row-actions">
          ${u.status === 'INVITED'
            ? `<button
                type="button"
                class="btn btn--ghost row-action row-action--resend"
                hx-post="/admin/users/${u.id}/resend-invite"
                hx-target="#users-table-container"
                hx-swap="outerHTML"
                title="Resend Invite"
              >
                <i data-lucide="send"></i>
                <span>Resend</span>
              </button>`
            : u.status === 'SUSPENDED'
              ? `<button
                  type="button"
                  class="btn btn--ghost row-action row-action--activate"
                  hx-post="/admin/users/${u.id}/activate"
                  hx-target="#users-table-container"
                  hx-swap="outerHTML"
                  title="Activate"
                >
                  <i data-lucide="user-check"></i>
                  <span>Activate</span>
                </button>`
              : `<a href="/admin/users/${u.id}/edit" class="btn btn--ghost row-action row-action--edit">
                  <i data-lucide="pencil"></i>
                  <span>Edit</span>
                </a>`
          }
          <button
            type="button"
            class="btn btn--ghost row-action row-action--delete"
            data-user-id="${u.id}"
            data-user-name="${escapeHtml(u.firstName + ' ' + u.lastName)}"
            data-user-role="${u.role}"
            onclick="openDeleteModal(this)"
          >
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  const paginationMarkup = totalPages > 1
    ? buildPaginationHtml({ basePath: '/admin/users', page, totalPages, filters, filterKeys: USER_FILTER_KEYS })
    : '';

  return `
    <div class="table">
      <table class="table__table">
        <thead class="table__thead">
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Date Joined</th>
            <th>Last Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody class="table__tbody">
          ${rows}
        </tbody>
      </table>
    </div>
    ${paginationMarkup}
  `;
}

// Helper Functions

function emptyState() {
  return `
    <div class="empty">
      <h3>No users found</h3>
      <p>Get started by inviting your first team member to collaborate on your blog.</p>
    </div>
  `;
}

function getRoleBadgeClass(role) {
  const classes = {
    ADMIN: 'danger',
    EDITOR: 'warning',
    AUTHOR: 'info',
    VIEWER: 'neutral',
  };
  return classes[role] || 'neutral';
}

function getStatusClass(status) {
  const classes = {
    ACTIVE: 'success',
    INVITED: 'warning',
    SUSPENDED: 'neutral',
  };
  return classes[status] || 'neutral';
}
