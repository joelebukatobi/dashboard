// src/admin/controllers/settings.controller.js
// Settings controller - handles settings HTTP requests

import { settingsService } from '../../services/settings.service.js';
import { successToast, errorToast } from '../templates/partials/alerts.js';

/**
 * Settings Controller
 * Handles settings-related HTTP requests
 */
class SettingsController {
  /**
   * GET /admin/settings
   * Show settings page
   */
  async showSettings(request, reply) {
    try {
      const user = request.user;

      // Check if user is admin
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return reply.type('text/html').send(errorToast({
          message: 'Access denied. Admin only.',
        }));
      }

      // Get all settings grouped by category
      const settings = await settingsService.getSettingsForUI();

      // Import settings template
      const { settingsPage } = await import('../templates/pages/settings/index.js');

      return reply.type('text/html').send(
        settingsPage({ user, settings })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load settings.',
      }));
    }
  }

  /**
   * PUT /admin/settings
   * Update settings
   */
  async updateSettings(request, reply) {
    try {
      const user = request.user;

      // Check if user is admin
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return reply.type('text/html').send(errorToast({
          message: 'Access denied. Admin only.',
        }));
      }

      const body = request.body;

      // Group settings by their group
      const generalSettings = {};
      const securitySettings = {};
      const contentSettings = {};
      const emailSettings = {};
      const socialSettings = {};

      // Sort settings into groups based on key prefixes
      for (const [key, value] of Object.entries(body)) {
        if (key === '_csrf') continue;

        if (key.startsWith('site') || ['timezone', 'dateFormat', 'language'].includes(key)) {
          generalSettings[key] = value;
        } else if (key.startsWith('session') || key.includes('Password') || key.includes('twoFactor')) {
          securitySettings[key] = value;
        } else if (key.startsWith('posts') || key.includes('Comments')) {
          contentSettings[key] = value;
        } else if (key.includes('smtp') || key.includes('email')) {
          emailSettings[key] = value;
        } else if (key.includes('social') || key.includes('twitter') || key.includes('facebook')) {
          socialSettings[key] = value;
        } else {
          generalSettings[key] = value;
        }
      }

      // Update each group
      await Promise.all([
        Object.keys(generalSettings).length > 0 && settingsService.updateSettings(generalSettings, 'GENERAL'),
        Object.keys(securitySettings).length > 0 && settingsService.updateSettings(securitySettings, 'SECURITY'),
        Object.keys(contentSettings).length > 0 && settingsService.updateSettings(contentSettings, 'CONTENT'),
        Object.keys(emailSettings).length > 0 && settingsService.updateSettings(emailSettings, 'EMAIL'),
        Object.keys(socialSettings).length > 0 && settingsService.updateSettings(socialSettings, 'SOCIAL'),
      ].filter(Boolean));

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .type('text/html')
          .send(successToast({ message: 'Settings saved successfully.' }));
      }

      // Reload settings and return page with success
      const settings = await settingsService.getSettingsForUI();
      const { settingsPage } = await import('../templates/pages/settings/index.js');

      return reply.type('text/html').send(
        settingsPage({ user, settings, toast: 'saved' })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to save settings.',
      }));
    }
  }

  /**
   * POST /admin/settings/logo
   * Upload site logo
   */
  async uploadLogo(request, reply) {
    try {
      const user = request.user;

      if (user.role !== 'ADMIN') {
        reply.code(403);
        return reply.type('text/html').send(errorToast({
          message: 'Access denied.',
        }));
      }

      // Logo upload placeholder
      return reply.type('text/html').send(successToast({
        message: 'Logo upload not yet implemented.',
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to upload logo.',
      }));
    }
  }
}

export const settingsController = new SettingsController();
