// src/admin/templates/pages/users/list.js
// Users List Page - Refactored with list-toolbar partial

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatDate, formatRelativeTime, USER_ROLE_LABELS, USER_STATUS_LABELS } from '../../utils/helpers.js';



/**
 * Users List Page Template
 * Display all users with filters, role/status badges, and pagination
 */
export function usersListPage({ users, pagination, counts, filters, user, toast }) {
  const { total, page, totalPages, limit } = pagination;
  const { roleCounts = {}, statusCounts = {} } = counts || {};

  // Build toast script
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          created: 'User created successfully!',
          updated: 'User updated successfully!',
          deleted: 'User deleted successfully!',
          suspended: 'User suspended successfully!',
          activated: 'User activated successfully!',
          'invite-resent': 'Invitation resent successfully!',
        };
        const message = toastMessages['${toast}'] || '${toast}';
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  ` : '';

  // Initialize delete modal
  const deleteModal = new DeleteModal({
    entityName: 'User',
    entityLabel: 'name',
    deleteUrlPath: '/admin/users',
    csrfToken: user?.csrfToken || '',
    title: 'Remove User?'
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

          ${totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
        `
        }
        </div>
      </div>
    </div>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Users',
    description: 'Manage team members and permissions',
    content: content + deleteModal.render(),
    user,
    activeRoute: '/admin/users',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Users', url: '/admin/users' },
    ],
  });
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

function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.role) params.set('role', filters.role);
  if (filters?.status) params.set('status', filters.status);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/users?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

  // Page numbers
  let pageNumbers = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (page <= 3) {
    pageNumbers = [1, 2, 3, 4, '...', totalPages];
  } else if (page >= totalPages - 2) {
    pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pageNumbers = [1, '...', page - 1, page, page + 1, '...', totalPages];
  }

  pageNumbers.forEach((p) => {
    if (p === '...') {
      links += '<span class="pagination__ellipsis">...</span>';
    } else {
      const active = p === page ? 'pagination__item--active' : '';
      links += `<a href="/admin/users?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/users?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}
