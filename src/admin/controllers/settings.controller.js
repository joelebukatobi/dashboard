// src/admin/controllers/settings.controller.js
// Settings controller - handles settings HTTP requests

import { settingsService } from '../../services/settings.service.js';
import {
  renderAdminPage,
  renderFragment,
  errorAlert,
  successAlert,
} from '../render.js';

class SettingsController {
  async showSettings(request, reply) {
    try {
      const user = request.user;

      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({
          message: 'Access denied. Admin only.',
        }));
      }

      const settings = await settingsService.getSettingsForUI();
      const { settingsContent, settingsMeta } = await import('../templates/pages/settings/index.js');

      return renderAdminPage(
        request,
        reply,
        settingsMeta(),
        settingsContent({ user, settings }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load settings.',
      }));
    }
  }

  async updateSettings(request, reply) {
    try {
      const user = request.user;

      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({
          message: 'Access denied. Admin only.',
        }));
      }

      const body = request.body;

      const generalSettings = {};
      const securitySettings = {};
      const contentSettings = {};
      const emailSettings = {};
      const socialSettings = {};

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

      await Promise.all([
        Object.keys(generalSettings).length > 0 && settingsService.updateSettings(generalSettings, 'GENERAL'),
        Object.keys(securitySettings).length > 0 && settingsService.updateSettings(securitySettings, 'SECURITY'),
        Object.keys(contentSettings).length > 0 && settingsService.updateSettings(contentSettings, 'CONTENT'),
        Object.keys(emailSettings).length > 0 && settingsService.updateSettings(emailSettings, 'EMAIL'),
        Object.keys(socialSettings).length > 0 && settingsService.updateSettings(socialSettings, 'SOCIAL'),
      ].filter(Boolean));

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return renderFragment(reply, successAlert({ message: 'Settings saved successfully.' }));
      }

      const settings = await settingsService.getSettingsForUI();
      const { settingsContent, settingsMeta } = await import('../templates/pages/settings/index.js');

      return renderAdminPage(
        request,
        reply,
        settingsMeta(),
        settingsContent({ user, settings, toast: 'saved' }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to save settings.',
      }));
    }
  }

  async uploadLogo(request, reply) {
    try {
      const user = request.user;

      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({
          message: 'Access denied.',
        }));
      }

      return renderFragment(reply, successAlert({
        message: 'Logo upload not yet implemented.',
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to upload logo.',
      }));
    }
  }
}

export const settingsController = new SettingsController();
