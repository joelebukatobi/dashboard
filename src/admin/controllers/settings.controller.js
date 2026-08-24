// src/admin/controllers/settings.controller.js
// Settings controller - handles settings HTTP requests

import { settingsService } from '../../services/settings.service.js';
import { usersService } from '../../services/users.service.js';
import { imagesService } from '../../services/images.service.js';
import { saveSiteIconUpload, validateMediaIconPath } from '../../services/site-icon.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  setHtmxToast,
  htmxRedirect,
} from '../render.js';
import { parseSocialLinksFromBody, parseSocialHiddenPlatformsFromBody } from '../../lib/social-links.js';
import { encryptSecret } from '../../lib/secret-crypto.js';
import { mailService } from '../../services/mail.service.js';

const BOOLEAN_KEYS = new Set([
  'enableComments',
  'moderateComments',
  'requireStrongPasswords',
  'twoFactorAuth',
]);

function parseBodyValue(value) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

function normalizeBooleanFields(body) {
  for (const key of BOOLEAN_KEYS) {
    if (key in body) {
      body[key] = parseBodyValue(body[key]) === 'true' ? 'true' : 'false';
    }
  }
}

async function persistSiteIcon(request, iconPath) {
  await settingsService.updateSettings({ siteIcon: iconPath }, 'GENERAL');
  request.server.siteSettings?.invalidate();
}

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
      const totpStatus = await usersService.getUserTotpStatus(user.id);
      const { settingsContent, settingsMeta } = await import('../templates/pages/settings/index.js');

      return renderAdminPage(
        request,
        reply,
        settingsMeta(),
        settingsContent({
          user: {
            ...user,
            totpEnabled: totpStatus.enrolled,
            totpPending: totpStatus.pending,
          },
          settings,
          toast: request.query.toast,
        }),
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

      const body = { ...request.body };
      normalizeBooleanFields(body);

      const hasCustomSocialFields = 'socialLinkLabel' in body || 'socialLinkUrl' in body;
      const hasSocialHiddenField = 'socialHiddenPlatforms' in body;
      const customSocialLinks = hasCustomSocialFields ? parseSocialLinksFromBody(body) : null;
      const hiddenSocialPlatforms = hasSocialHiddenField ? parseSocialHiddenPlatformsFromBody(body) : null;
      if (hasCustomSocialFields) {
        delete body.socialLinkLabel;
        delete body.socialLinkUrl;
      }
      if (hasSocialHiddenField) {
        delete body.socialHiddenPlatforms;
      }

      const generalSettings = {};
      const securitySettings = {};
      const contentSettings = {};
      const emailSettings = {};
      const socialSettings = {};

      for (const [key, value] of Object.entries(body)) {
        if (key === '_csrf') continue;
        const parsed = parseBodyValue(value);

        if (key.startsWith('site') || ['timezone', 'dateFormat'].includes(key)) {
          generalSettings[key] = parsed;
        } else if (key.includes('smtp') || key.startsWith('email')) {
          emailSettings[key] = parsed;
        } else if (key.startsWith('session') || key.includes('Password') || key.includes('twoFactor')) {
          securitySettings[key] = parsed;
        } else if (key.startsWith('posts') || key.includes('Comments')) {
          contentSettings[key] = parsed;
        } else if (key.includes('social') || key.includes('twitter') || key.includes('facebook')) {
          socialSettings[key] = parsed;
        } else {
          generalSettings[key] = parsed;
        }
      }

      if (hasCustomSocialFields) {
        socialSettings.socialLinks = customSocialLinks;
      }

      if (hasSocialHiddenField) {
        socialSettings.socialHiddenPlatforms = hiddenSocialPlatforms;
      }

      if ('smtpPassword' in emailSettings) {
        const nextPassword = String(emailSettings.smtpPassword || '').trim();
        if (!nextPassword) {
          delete emailSettings.smtpPassword;
        } else {
          emailSettings.smtpPassword = encryptSecret(nextPassword);
        }
      }

      await Promise.all([
        Object.keys(generalSettings).length > 0 && settingsService.updateSettings(generalSettings, 'GENERAL'),
        Object.keys(securitySettings).length > 0 && settingsService.updateSettings(securitySettings, 'SECURITY'),
        Object.keys(contentSettings).length > 0 && settingsService.updateSettings(contentSettings, 'CONTENT'),
        Object.keys(emailSettings).length > 0 && settingsService.updateSettings(emailSettings, 'EMAIL'),
        Object.keys(socialSettings).length > 0 && settingsService.updateSettings(socialSettings, 'SOCIAL'),
      ].filter(Boolean));

      request.server.siteSettings?.invalidate();

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return renderEmpty(setHtmxToast(reply, { message: 'Settings saved successfully!' }));
      }

      const settings = await settingsService.getSettingsForUI();
      const { settingsContent, settingsMeta } = await import('../templates/pages/settings/index.js');
      const totpStatus = await usersService.getUserTotpStatus(user.id);

      return renderAdminPage(
        request,
        reply,
        settingsMeta(),
        settingsContent({
          user: {
            ...user,
            totpEnabled: totpStatus.enrolled,
            totpPending: totpStatus.pending,
          },
          settings,
          toast: 'saved',
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to save settings.',
      }));
    }
  }

  async uploadSiteIcon(request, reply) {
    try {
      const user = request.user;
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'Access denied.' }));
      }

      const parts = request.parts();
      let file = null;

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'icon') {
          const buffer = await part.toBuffer();
          file = {
            mimetype: part.mimetype,
            toBuffer: async () => buffer,
          };
        }
      }

      if (!file) {
        reply.code(400);
        return renderFragment(reply, errorAlert({ message: 'No icon file provided.' }));
      }

      const iconPath = await saveSiteIconUpload(file);
      await persistSiteIcon(request, iconPath);

      return htmxRedirect(reply, '/admin/settings?toast=iconUploaded');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to upload icon.',
      }));
    }
  }

  async selectSiteIcon(request, reply) {
    try {
      const user = request.user;
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'Access denied.' }));
      }

      const iconPath = validateMediaIconPath(parseBodyValue(request.body?.siteIcon));
      await persistSiteIcon(request, iconPath);

      return htmxRedirect(reply, '/admin/settings?toast=iconSelected');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to set icon.',
      }));
    }
  }

  async removeSiteIcon(request, reply) {
    try {
      const user = request.user;
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'Access denied.' }));
      }

      await persistSiteIcon(request, '');
      return htmxRedirect(reply, '/admin/settings?toast=iconRemoved');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to remove icon.',
      }));
    }
  }

  async showIconPicker(request, reply) {
    try {
      const user = request.user;
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'Access denied.' }));
      }

      const { data: images } = await imagesService.getAll({ page: 1, limit: 24 });
      const { siteIconPickerFragment } = await import('../templates/partials/site-icon-picker.js');

      return renderFragment(reply, siteIconPickerFragment({
        images: images.map((img) => ({
          id: img.id,
          path: img.path,
          thumbnailPath: img.thumbnailPath,
          title: img.title || img.originalName,
        })),
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load images.',
      }));
    }
  }

  /** @deprecated use uploadSiteIcon */
  async uploadLogo(request, reply) {
    return this.uploadSiteIcon(request, reply);
  }

  /**
   * POST /admin/settings/email/test
   */
  async sendTestEmail(request, reply) {
    try {
      const user = request.user;
      if (user.role !== 'ADMIN') {
        reply.code(403);
        return renderFragment(reply, errorAlert({ message: 'Access denied. Admin only.' }));
      }

      const settingsMap = await request.server.siteSettings.getMap();
      const to = String(parseBodyValue(request.body?.testEmailTo) || user.email).trim();

      await mailService.sendTestEmail(settingsMap, to);

      return renderEmpty(setHtmxToast(reply, {
        message: `Test email sent to ${to}.`,
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to send test email.',
      }));
    }
  }
}

export const settingsController = new SettingsController();
