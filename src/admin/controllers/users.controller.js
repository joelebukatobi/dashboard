// src/admin/controllers/users.controller.js
// Users controller - handles user HTTP requests

import { usersService } from '../../services/users.service.js';
import { successToast, errorToast } from '../templates/partials/alerts.js';

/**
 * Users Controller
 * Handles user-related HTTP requests
 */
class UsersController {
  /**
   * GET /admin/users
   * List all users
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const {
        role,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        toast,
      } = request.query;

      // Get users with pagination
      const { users, total, totalPages, limit } = await usersService.getAllUsers({
        role,
        status,
        search,
        sortBy,
        sortOrder,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      // Get counts for filter tabs
      const roleCounts = await usersService.countByRole();
      const statusCounts = await usersService.countByStatus();

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return only table fragment
        return reply.type('text/html').send(usersTableFragment({
          users,
          total,
          page: parseInt(page, 10) || 1,
          totalPages,
          limit,
          filters: { role, status, search },
        }));
      }

      // Import users list template
      const { usersListPage } = await import('../templates/pages/users/index.js');

      return reply.type('text/html').send(
        usersListPage({
          user,
          users,
          pagination: { total, page: parseInt(page, 10) || 1, totalPages, limit },
          counts: { roleCounts, statusCounts },
          filters: { role, status, search },
          toast,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load users.',
      }));
    }
  }

  /**
   * GET /admin/users/new
   * Show new user form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;

      // Import new user template
      const { usersNewPage } = await import('../templates/pages/users/index.js');

      return reply.type('text/html').send(
        usersNewPage({ user })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load form.',
      }));
    }
  }

  /**
   * POST /admin/users
   * Create a new user
   */
  async create(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { firstName, lastName, email, role, sendInvite } = request.body;

      // Validation
      if (!firstName || !lastName || !email || !role) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'All fields are required.',
        }));
      }

      // Check if email already exists
      const existingUser = await usersService.getUserByEmail(email);
      if (existingUser) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'A user with this email already exists.',
        }));
      }

      // Create user
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role,
      };

      const newUser = await usersService.createUser(userData, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .header('HX-Redirect', '/admin/users?toast=created')
          .type('text/html')
          .send(successToast({ message: 'User created successfully.' }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=created').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to create user.',
      }));
    }
  }

  /**
   * GET /admin/users/:id/edit
   * Show edit user form
   */
  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get user
      const editUser = await usersService.getUserById(id);

      if (!editUser) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Get user stats
      const userStats = await usersService.getUserStats(id);

      // Import edit user template
      const { usersEditPage } = await import('../templates/pages/users/index.js');

      return reply.type('text/html').send(
        usersEditPage({ user, editUser, userStats })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load user.',
      }));
    }
  }

  /**
   * PUT /admin/users/:id
   * Update a user
   */
  async update(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { id } = request.params;
      const { firstName, lastName, email, role } = request.body;

      // Get user
      const existingUser = await usersService.getUserById(id);
      if (!existingUser) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Prevent self-role change if last admin
      if (id === currentUserId && role && role !== existingUser.role) {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin && existingUser.role === 'ADMIN') {
          reply.code(400);
          return reply.type('text/html').send(errorToast({
            message: 'Cannot change role. You are the last admin.',
          }));
        }
      }

      // Check if email already exists (if changing email)
      if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const userWithEmail = await usersService.getUserByEmail(email);
        if (userWithEmail && userWithEmail.id !== id) {
          reply.code(400);
          return reply.type('text/html').send(errorToast({
            message: 'A user with this email already exists.',
          }));
        }
      }

      // Update user
      const updateData = {};
      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (email) updateData.email = email.trim().toLowerCase();
      if (role) updateData.role = role;

      await usersService.updateUser(id, updateData, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .header('HX-Redirect', '/admin/users?toast=updated')
          .type('text/html')
          .send(successToast({ message: 'User updated successfully.' }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=updated').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to update user.',
      }));
    }
  }

  /**
   * DELETE /admin/users/:id
   * Delete a user
   */
  async delete(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { id } = request.params;

      // Get user
      const userToDelete = await usersService.getUserById(id);
      if (!userToDelete) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Prevent self-deletion
      if (id === currentUserId) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'You cannot delete your own account.',
        }));
      }

      // Prevent deleting last admin
      if (userToDelete.role === 'ADMIN' && userToDelete.status === 'ACTIVE') {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin) {
          reply.code(400);
          return reply.type('text/html').send(errorToast({
            message: 'Cannot delete the last admin user.',
          }));
        }
      }

      // Delete user
      await usersService.deleteUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .header('HX-Redirect', '/admin/users?toast=deleted')
          .type('text/html')
          .send(successToast({ message: 'User deleted successfully.' }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=deleted').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to delete user.',
      }));
    }
  }

  /**
   * POST /admin/users/:id/suspend
   * Suspend a user
   */
  async suspend(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { id } = request.params;

      // Get user
      const userToSuspend = await usersService.getUserById(id);
      if (!userToSuspend) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Prevent self-suspension
      if (id === currentUserId) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'You cannot suspend your own account.',
        }));
      }

      // Prevent suspending last admin
      if (userToSuspend.role === 'ADMIN') {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin) {
          reply.code(400);
          return reply.type('text/html').send(errorToast({
            message: 'Cannot suspend the last admin user.',
          }));
        }
      }

      // Suspend user
      await usersService.suspendUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply.type('text/html').send(successToast({
          message: 'User suspended successfully.',
        }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=suspended').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to suspend user.',
      }));
    }
  }

  /**
   * POST /admin/users/:id/activate
   * Activate a suspended user
   */
  async activate(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { id } = request.params;

      // Get user
      const userToActivate = await usersService.getUserById(id);
      if (!userToActivate) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Activate user
      await usersService.activateUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply.type('text/html').send(successToast({
          message: 'User activated successfully.',
        }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=activated').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to activate user.',
      }));
    }
  }

  /**
   * POST /admin/users/:id/resend-invite
   * Resend invitation to a user
   */
  async resendInvite(request, reply) {
    try {
      const currentUserId = request.user?.id;
      const { id } = request.params;

      // Get user
      const userToInvite = await usersService.getUserById(id);
      if (!userToInvite) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Only invited users can have invitation resent
      if (userToInvite.status !== 'INVITED') {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Invitation can only be resent for users with invited status.',
        }));
      }

      // Resend invite
      await usersService.resendInvite(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply.type('text/html').send(successToast({
          message: 'Invitation resent successfully.',
        }));
      }

      return reply.header('HX-Redirect', '/admin/users?toast=invite-resent').send();
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to resend invitation.',
      }));
    }
  }

  /**
   * POST /admin/users/:id/avatar
   * Upload avatar for user
   */
  async uploadAvatar(request, reply) {
    try {
      const { id } = request.params;

      // Get user
      const user = await usersService.getUserById(id);
      if (!user) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'User not found.',
        }));
      }

      // Get file from multipart
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'No file provided.',
        }));
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Invalid file type. Only JPG and PNG allowed.',
        }));
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const buffer = await data.toBuffer();
      if (buffer.length > maxSize) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'File too large. Maximum size is 10MB.',
        }));
      }

      // Upload avatar
      const avatarUrl = await usersService.uploadAvatar(id, { toBuffer: () => Promise.resolve(buffer), mimetype: data.mimetype });

      // Update user's avatar URL
      await usersService.updateAvatar(id, avatarUrl);

      // Return success for HTMX
      return reply.type('text/html').send(`
        <div class="flex flex-col items-center">
          <img src="${avatarUrl}?t=${Date.now()}" alt="${user.firstName}" class="h-24 w-24 rounded-full object-cover mb-4" />
          <p class="text-sm text-green-600">Avatar updated successfully!</p>
        </div>
      `);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to upload avatar.',
      }));
    }
  }
}

/**
 * Generate users table HTML fragment for HTMX updates
 * Matches the structure in users/list.js exactly
 */
function usersTableFragment({ users, total, page, totalPages, limit, filters = {} }) {
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

  // Build pagination
  let paginationHtml = '';
  if (totalPages > 1) {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    const baseQuery = params.toString();
    const queryPrefix = baseQuery ? `&${baseQuery}` : '';

    let links = '';
    const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
    const prevHref = page > 1 ? `/admin/users?page=${page - 1}${queryPrefix}` : '#';
    links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

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

    const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
    const nextHref = page < totalPages ? `/admin/users?page=${page + 1}${queryPrefix}` : '#';
    links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

    paginationHtml = `
      <footer class="page-footer">
        <div class="pagination">${links}</div>
      </footer>
    `;
  }

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
    ${paginationHtml}
  `;
}

export const usersController = new UsersController();
