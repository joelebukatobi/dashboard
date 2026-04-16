// src/admin/templates/pages/users/list.js
// Users List Page - Based on users.html reference

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';

// Tailwind utility classes (matching posts pattern exactly)
const listToolbarClass = 'mb-[1.6rem] flex shrink-0 flex-col gap-[1.6rem] sm:flex-row sm:items-center';
const listToolbarSearchClass = 'relative min-w-0 flex-1';
const listToolbarSearchIconClass = 'pointer-events-none absolute left-[1rem] top-1/2 h-[1.6rem] w-[1.6rem] -translate-y-1/2 text-grey-400 dark:text-grey-500';
const listToolbarInputClass = 'h-[3.2rem] w-full rounded-md border border-grey-100/50 bg-white px-[1.2rem] pl-[4.4rem] text-body-sm text-grey-900 outline-none transition-all duration-200 placeholder:text-body-sm placeholder:text-grey-400 hover:border-grey-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-grey-700 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-500 dark:hover:border-grey-600';
const listToolbarControlsClass = 'flex flex-wrap items-center gap-[1.2rem]';
const listToolbarDropdownClass = 'relative';
const listToolbarDropdownTriggerClass = 'inline-flex h-[3.2rem] items-center gap-[0.6rem] rounded-md border border-grey-200 bg-white px-[1.2rem] text-[1.3rem] font-medium text-grey-700 transition-all duration-200 hover:border-blue-600/30 hover:bg-blue-600/10 hover:text-blue-700 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-300 dark:hover:border-grey-600 dark:hover:bg-grey-800 dark:hover:text-grey-200';
const listToolbarButtonClass = 'inline-flex h-[3.2rem] items-center justify-center gap-[0.8rem] rounded-md bg-blue-600 px-[1.2rem] text-body-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:text-white focus:ring-[.08rem] focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-grey-900 dark:hover:bg-grey-100';
const rowActionIconClass = 'h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]';
const rowActionTextClass = 'lg:hidden';

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
        <div class="${listToolbarClass}">
          <div class="${listToolbarSearchClass}">
            <i data-lucide="search" class="${listToolbarSearchIconClass}"></i>
            <input
              type="text"
              class="${listToolbarInputClass}"
              placeholder="Search users..."
              value="${filters.search || ''}"
              hx-get="/admin/users"
              hx-target="#users-table-container"
              hx-trigger="keyup changed delay:500ms"
              name="search"
            />
          </div>

          <div class="${listToolbarControlsClass}">
            <!-- Role Filter -->
            <div class="hs-dropdown ${listToolbarDropdownClass}">
              <button
                id="hs-dropdown-role"
                type="button"
                class="hs-dropdown-toggle inline-flex h-[3.2rem] items-center gap-[0.6rem] rounded-md border px-[1.2rem] text-[1.3rem] font-medium transition-all duration-200 ${filters.role ? 'border-blue-600/30 bg-blue-600/10 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400' : 'border-grey-200 bg-white text-grey-700 hover:border-blue-600/30 hover:bg-blue-600/10 hover:text-blue-700 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-300 dark:hover:border-grey-600 dark:hover:bg-grey-800 dark:hover:text-grey-200'}"
              >
                <span>${filters.role || 'Role'}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="hs-dropdown-menu dropdown__menu dropdown__menu--sm" aria-labelledby="hs-dropdown-role">
                <a href="/admin/users${filters.status ? '?status=' + filters.status : ''}" class="dropdown__item ${!filters.role ? 'dropdown__item--active' : ''}">All Roles</a>
                <a href="/admin/users?role=ADMIN${filters.status ? '&status=' + filters.status : ''}" class="dropdown__item ${filters.role === 'ADMIN' ? 'dropdown__item--active' : ''}">Admin</a>
                <a href="/admin/users?role=EDITOR${filters.status ? '&status=' + filters.status : ''}" class="dropdown__item ${filters.role === 'EDITOR' ? 'dropdown__item--active' : ''}">Editor</a>
                <a href="/admin/users?role=AUTHOR${filters.status ? '&status=' + filters.status : ''}" class="dropdown__item ${filters.role === 'AUTHOR' ? 'dropdown__item--active' : ''}">Author</a>
                <a href="/admin/users?role=VIEWER${filters.status ? '&status=' + filters.status : ''}" class="dropdown__item ${filters.role === 'VIEWER' ? 'dropdown__item--active' : ''}">Viewer</a>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="hs-dropdown ${listToolbarDropdownClass}">
              <button
                id="hs-dropdown-status"
                type="button"
                class="hs-dropdown-toggle inline-flex h-[3.2rem] items-center gap-[0.6rem] rounded-md border px-[1.2rem] text-[1.3rem] font-medium transition-all duration-200 ${filters.status ? 'border-blue-600/30 bg-blue-600/10 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400' : 'border-grey-200 bg-white text-grey-700 hover:border-blue-600/30 hover:bg-blue-600/10 hover:text-blue-700 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-300 dark:hover:border-grey-600 dark:hover:bg-grey-800 dark:hover:text-grey-200'}"
              >
                <span>${filters.status || 'Status'}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="hs-dropdown-menu dropdown__menu dropdown__menu--sm" aria-labelledby="hs-dropdown-status">
                <a href="/admin/users${filters.role ? '?role=' + filters.role : ''}" class="dropdown__item ${!filters.status ? 'dropdown__item--active' : ''}">All Statuses</a>
                <a href="/admin/users?status=ACTIVE${filters.role ? '&role=' + filters.role : ''}" class="dropdown__item ${filters.status === 'ACTIVE' ? 'dropdown__item--active' : ''}">Active</a>
                <a href="/admin/users?status=INVITED${filters.role ? '&role=' + filters.role : ''}" class="dropdown__item ${filters.status === 'INVITED' ? 'dropdown__item--active' : ''}">Invited</a>
                <a href="/admin/users?status=SUSPENDED${filters.role ? '&role=' + filters.role : ''}" class="dropdown__item ${filters.status === 'SUSPENDED' ? 'dropdown__item--active' : ''}">Suspended</a>
              </div>
            </div>

            <!-- Add User -->
            <a href="/admin/users/new" class="${listToolbarButtonClass}">
              <i data-lucide="user-plus" class="h-4 w-4"></i>
              <span>Add User</span>
            </a>
          </div>
        </div>

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
                  <tr class="table__tr ${u.status === 'SUSPENDED' ? 'opacity-60' : ''}">
                    <td class="table__td">
                      <span class="table__label">User</span>
                      <div class="table__title ${u.status === 'SUSPENDED' ? 'text-grey-400' : ''}">
                        <a href="/admin/users/${u.id}/edit">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</a>
                      </div>
                    </td>
                    <td class="table__td">
                      <span class="table__label">Role</span>
                      <span class="badge badge--${getRoleBadgeClass(u.role)}">${u.role}</span>
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
                      <div class="flex items-center justify-end gap-[1.2rem] lg:gap-[0.64rem]">
                        ${u.status === 'INVITED' 
                          ? `<button
                              type="button"
                              class="btn btn--ghost row-action row-action--resend"
                              hx-post="/admin/users/${u.id}/resend-invite"
                              hx-target="#users-table-container"
                              hx-swap="outerHTML"
                              title="Resend Invite"
                            >
                              <i data-lucide="send" class="${rowActionIconClass}"></i>
                              <span class="${rowActionTextClass}">Resend</span>
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
                                <i data-lucide="user-check" class="${rowActionIconClass}"></i>
                                <span class="${rowActionTextClass}">Activate</span>
                              </button>`
                            : `<a href="/admin/users/${u.id}/edit" class="btn btn--ghost row-action row-action--edit">
                                <i data-lucide="pencil" class="${rowActionIconClass}"></i>
                                <span class="${rowActionTextClass}">Edit</span>
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
                          <i data-lucide="trash-2" class="${rowActionIconClass}"></i>
                          <span class="${rowActionTextClass}">Delete</span>
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

/**
 * Empty state component
 */
function emptyState() {
  return `
    <div class="empty">
      <h3>No users found</h3>
      <p>Get started by inviting your first team member to collaborate on your blog.</p>
    </div>
  `;
}

/**
 * Pagination component
 */
function paginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? '&' : '?';

  let pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Previous
  if (page > 1) {
    pages.push(`<a href="/admin/users${baseQuery ? '?' + baseQuery : ''}${queryPrefix}page=${page - 1}" class="pagination__item"><i data-lucide="chevron-left"></i></a>`);
  }

  // First page + ellipsis
  if (startPage > 1) {
    pages.push(`<a href="/admin/users${baseQuery ? '?' + baseQuery : ''}" class="pagination__item">1</a>`);
    if (startPage > 2) {
      pages.push(`<span class="pagination__ellipsis">...</span>`);
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(`<a href="/admin/users${baseQuery ? '?' + baseQuery : ''}${queryPrefix}page=${i}" class="pagination__item ${i === page ? 'pagination__item--active' : ''}">${i}</a>`);
  }

  // Last page + ellipsis
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(`<span class="pagination__ellipsis">...</span>`);
    }
    pages.push(`<a href="/admin/users${baseQuery ? '?' + baseQuery : ''}${queryPrefix}page=${totalPages}" class="pagination__item">${totalPages}</a>`);
  }

  // Next
  if (page < totalPages) {
    pages.push(`<a href="/admin/users${baseQuery ? '?' + baseQuery : ''}${queryPrefix}page=${page + 1}" class="pagination__item"><i data-lucide="chevron-right"></i></a>`);
  }

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${pages.join('')}
      </div>
    </footer>
  `;
}

/**
 * Get badge class for role
 */
function getRoleBadgeClass(role) {
  const classes = {
    'ADMIN': 'primary',
    'EDITOR': 'purple',
    'AUTHOR': 'info',
    'VIEWER': 'warning'
  };
  return classes[role] || 'default';
}

/**
 * Get status class
 */
function getStatusClass(status) {
  const classes = {
    'ACTIVE': 'success',
    'INVITED': 'warning',
    'SUSPENDED': 'danger'
  };
  return classes[status] || 'default';
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
