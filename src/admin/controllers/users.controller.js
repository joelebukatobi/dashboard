// src/admin/controllers/users.controller.js
// Users controller - handles user HTTP requests

import { usersService } from '../../services/users.service.js';
import { isSettingEnabled } from '../../services/settings.service.js';
import { isUserTotpEnabled, canDisableUserTotp } from '../../lib/user-totp.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  successAlert,
  htmxRedirect,
} from '../render.js';

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

      const {
        usersListContent,
        usersListMeta,
        usersTableFragment,
      } = await import('../templates/pages/users/index.js');

      if (isHtmx) {
        return renderFragment(reply, usersTableFragment({
          users,
          total,
          page: parseInt(page, 10) || 1,
          totalPages,
          limit,
          filters: { role, status, search },
        }));
      }

      return renderAdminPage(
        request,
        reply,
        usersListMeta({ user: request.user }),
        usersListContent({
          user,
          users,
          pagination: { total, page: parseInt(page, 10) || 1, totalPages, limit },
          counts: { roleCounts, statusCounts },
          filters: { role, status, search },
          toast,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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

      const { usersNewContent, userNewMeta } = await import('../templates/pages/users/index.js');

      return renderAdminPage(
        request,
        reply,
        userNewMeta(),
        usersNewContent({ user }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
      const { firstName, lastName, email, role } = request.body;

      // Check if email already exists
      const existingUser = await usersService.getUserByEmail(email);
      if (existingUser) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
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
        reply.header('HX-Redirect', '/admin/users?toast=created');
        return renderFragment(reply, successAlert({ message: 'User created successfully.' }));
      }

      return htmxRedirect(reply, '/admin/users?toast=created');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Get user stats
      const userStats = await usersService.getUserStats(id);

      const { usersEditContent, userEditMeta } = await import('../templates/pages/users/index.js');
      const siteMap = request.siteSettingsMap ?? {};
      const isSelf = user.id === id;
      /** @type {{ pending?: boolean, qrDataUrl?: string } | null} */
      let totpEnroll = null;
      if (isSelf) {
        const pending = await usersService.hasPendingTotpEnrollment(id);
        if (pending) totpEnroll = { pending: true };
      }

      const adminTotpRequired = editUser.role === 'ADMIN'
        && isSettingEnabled(siteMap.twoFactorAuth);

      return renderAdminPage(
        request,
        reply,
        userEditMeta({ editUser }),
        usersEditContent({
          user,
          editUser,
          userStats,
          totpEnroll,
          adminTotpRequired,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Prevent self-role change if last admin
      if (id === currentUserId && role && role !== existingUser.role) {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin && existingUser.role === 'ADMIN') {
          reply.code(400);
          return renderFragment(reply, errorAlert({
            message: 'Cannot change role. You are the last admin.',
          }));
        }
      }

      // Check if email already exists (if changing email)
      if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const userWithEmail = await usersService.getUserByEmail(email);
        if (userWithEmail && userWithEmail.id !== id) {
          reply.code(400);
          return renderFragment(reply, errorAlert({
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
        reply.header('HX-Redirect', '/admin/users?toast=updated');
        return renderFragment(reply, successAlert({ message: 'User updated successfully.' }));
      }

      return htmxRedirect(reply, '/admin/users?toast=updated');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Prevent self-deletion
      if (id === currentUserId) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'You cannot delete your own account.',
        }));
      }

      // Prevent deleting last admin
      if (userToDelete.role === 'ADMIN' && userToDelete.status === 'ACTIVE') {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin) {
          reply.code(400);
          return renderFragment(reply, errorAlert({
            message: 'Cannot delete the last admin user.',
          }));
        }
      }

      // Delete user
      await usersService.deleteUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        reply.header('HX-Redirect', '/admin/users?toast=deleted');
        return renderFragment(reply, successAlert({ message: 'User deleted successfully.' }));
      }

      return htmxRedirect(reply, '/admin/users?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Prevent self-suspension
      if (id === currentUserId) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'You cannot suspend your own account.',
        }));
      }

      // Prevent suspending last admin
      if (userToSuspend.role === 'ADMIN') {
        const isLastAdmin = await usersService.isLastAdmin(id);
        if (isLastAdmin) {
          reply.code(400);
          return renderFragment(reply, errorAlert({
            message: 'Cannot suspend the last admin user.',
          }));
        }
      }

      // Suspend user
      await usersService.suspendUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return renderFragment(reply, successAlert({
          message: 'User suspended successfully.',
        }));
      }

      return htmxRedirect(reply, '/admin/users?toast=suspended');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Activate user
      await usersService.activateUser(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return renderFragment(reply, successAlert({
          message: 'User activated successfully.',
        }));
      }

      return htmxRedirect(reply, '/admin/users?toast=activated');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Only invited users can have invitation resent
      if (userToInvite.status !== 'INVITED') {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Invitation can only be resent for users with invited status.',
        }));
      }

      // Resend invite
      await usersService.resendInvite(id, currentUserId);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return renderFragment(reply, successAlert({
          message: 'Invitation resent successfully.',
        }));
      }

      return htmxRedirect(reply, '/admin/users?toast=invite-resent');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
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
        return renderFragment(reply, errorAlert({
          message: 'User not found.',
        }));
      }

      // Get file from multipart
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'No file provided.',
        }));
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Invalid file type. Only JPG and PNG allowed.',
        }));
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const buffer = await data.toBuffer();
      if (buffer.length > maxSize) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'File too large. Maximum size is 10MB.',
        }));
      }

      // Upload avatar
      const avatarUrl = await usersService.uploadAvatar(id, { toBuffer: () => Promise.resolve(buffer), mimetype: data.mimetype });

      // Update user's avatar URL
      await usersService.updateAvatar(id, avatarUrl);

      // Return success for HTMX
      return renderFragment(reply, `
        <div class="flex flex-col items-center">
          <img src="${avatarUrl}?t=${Date.now()}" alt="${user.firstName}" class="h-24 w-24 rounded-full object-cover mb-4" />
          <p class="text-sm text-green-600">Avatar updated successfully!</p>
        </div>
      `);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to upload avatar.',
      }));
    }
  }

  /**
   * POST /admin/users/:id/totp/enroll
   */
  async enrollTotp(request, reply) {
    try {
      const { id } = request.params;
      const currentUser = request.user;
      const siteMap = request.siteSettingsMap ?? {};
      const isSettingsModal = request.headers['hx-target'] === '#totpSetupBody'
        || request.query?.context === 'settings';

      if (currentUser.id !== id) {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'You can only manage 2FA on your own account.' }));
      }

      const editUser = await usersService.getUserById(id);
      if (!editUser) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'User not found.' }));
      }

      if (isUserTotpEnabled(editUser.totpEnabled)) {
        if (isSettingsModal) {
          const { totpSetupFragment } = await import('../templates/partials/totp-setup.js');
          return renderFragment(reply, totpSetupFragment({ userId: id, totpEnabled: true }));
        }
        reply.code(400);
        return renderFragment(reply, errorAlert({ message: '2FA is already enabled.' }));
      }

      const siteName = String(siteMap.siteName || 'Dashboard');
      const reset = request.query?.reset === 'true';
      const { qrDataUrl, pending } = await usersService.resumeOrStartTotpEnrollment(id, {
        email: editUser.email,
        siteName,
        reset,
      });

      if (isSettingsModal) {
        const { totpSetupFragment } = await import('../templates/partials/totp-setup.js');
        return renderFragment(reply, totpSetupFragment({
          userId: id,
          totpEnroll: { qrDataUrl, pending },
        }));
      }

      const { totpSectionHtml } = await import('../templates/pages/users/edit.js');
      const adminTotpRequired = editUser.role === 'ADMIN'
        && isSettingEnabled(siteMap.twoFactorAuth);
      return renderFragment(reply, totpSectionHtml({
        editUser: { ...editUser, totpEnabled: false },
        totpEnroll: { qrDataUrl },
        adminTotpRequired,
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to start 2FA enrollment.' }));
    }
  }

  /**
   * POST /admin/users/:id/totp/verify
   */
  async verifyTotpEnroll(request, reply) {
    try {
      const { id } = request.params;
      const { code } = request.body;
      const currentUser = request.user;

      if (currentUser.id !== id) {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'You can only manage 2FA on your own account.' }));
      }

      await usersService.confirmTotpEnrollment(id, code);

      const editUser = await usersService.getUserById(id);
      const isSettingsModal = request.headers['hx-target'] === '#totpSetupBody'
        || request.query?.context === 'settings';

      if (isSettingsModal) {
        return htmxRedirect(reply, '/admin/settings?toast=totpEnrolled');
      }

      const siteMap = request.siteSettingsMap ?? {};
      const { totpSectionHtml } = await import('../templates/pages/users/edit.js');
      const adminTotpRequired = editUser.role === 'ADMIN'
        && isSettingEnabled(siteMap.twoFactorAuth);
      return renderFragment(reply, totpSectionHtml({
        editUser,
        adminTotpRequired,
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message === 'Invalid verification code'
          ? 'Invalid code. Try again.'
          : 'Failed to enable 2FA.',
      }));
    }
  }

  /**
   * DELETE /admin/users/:id/totp
   */
  async disableTotp(request, reply) {
    try {
      const { id } = request.params;
      const currentUser = request.user;

      if (currentUser.id !== id) {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'You can only manage 2FA on your own account.' }));
      }

      const siteMap = request.siteSettingsMap ?? {};
      const editUser = await usersService.getUserById(id);
      if (!editUser) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'User not found.' }));
      }

      if (!canDisableUserTotp(editUser, siteMap)) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Admin two-factor authentication is required by site policy and cannot be disabled.',
        }));
      }

      await usersService.disableTotp(id);

      const { totpSectionHtml } = await import('../templates/pages/users/edit.js');
      const adminTotpRequired = editUser.role === 'ADMIN'
        && isSettingEnabled(siteMap.twoFactorAuth);
      return renderFragment(reply, totpSectionHtml({
        editUser,
        adminTotpRequired,
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to disable 2FA.' }));
    }
  }
}

export const usersController = new UsersController();
