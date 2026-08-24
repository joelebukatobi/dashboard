import nodemailer from 'nodemailer';
import { formatMailFrom, getMailSettings } from '../lib/mail-settings.js';
import {
  renderInviteEmail,
  renderPasswordResetEmail,
  renderTestEmail,
} from '../lib/email-templates.js';

function buildTransport(settings) {
  const transportOptions = {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
  };

  if (settings.user) {
    transportOptions.auth = {
      user: settings.user,
      pass: settings.pass,
    };
  }

  if (settings.requireTLS) {
    transportOptions.requireTLS = true;
    transportOptions.tls = { minVersion: 'TLSv1.2' };
  }

  return nodemailer.createTransport(transportOptions);
}

function resolveSiteUrl(map = {}) {
  const siteUrl = String(map.siteUrl || '').trim().replace(/\/$/, '');
  return siteUrl || 'http://localhost:3000';
}

function buildAuthUrl(map, path, token) {
  return `${resolveSiteUrl(map)}/admin/auth/${path}?token=${encodeURIComponent(token)}`;
}

class MailService {
  /**
   * @param {Record<string, unknown>} settingsMap
   */
  getSettings(settingsMap) {
    return getMailSettings(settingsMap);
  }

  isConfigured(settingsMap) {
    return getMailSettings(settingsMap).configured;
  }

  /**
   * @param {Record<string, unknown>} settingsMap
   * @param {{ to: string, subject: string, html: string, text?: string }} message
   */
  async send(settingsMap, { to, subject, html, text }) {
    const settings = getMailSettings(settingsMap);
    if (!settings.configured) {
      throw new Error('SMTP is not configured. Save your email settings first.');
    }

    const transport = buildTransport(settings);
    await transport.sendMail({
      from: formatMailFrom(settings),
      to,
      replyTo: settings.replyTo || undefined,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
  }

  async sendTestEmail(settingsMap, to) {
    const siteName = String(settingsMap.siteName || 'Dashboard');
    return this.send(settingsMap, {
      to,
      subject: `${siteName} — SMTP test`,
      html: renderTestEmail(settingsMap, {
        actionUrl: `${resolveSiteUrl(settingsMap)}/admin`,
      }),
    });
  }

  async sendPasswordResetEmail(settingsMap, { to, token, firstName }) {
    const siteName = String(settingsMap.siteName || 'Dashboard');
    const url = buildAuthUrl(settingsMap, 'reset-password', token);

    return this.send(settingsMap, {
      to,
      subject: `${siteName} — Reset your password`,
      html: renderPasswordResetEmail(settingsMap, {
        firstName,
        actionUrl: url,
      }),
    });
  }

  async sendInviteEmail(settingsMap, { to, token, firstName, invitedByName }) {
    const siteName = String(settingsMap.siteName || 'Dashboard');
    const url = buildAuthUrl(settingsMap, 'accept-invite', token);

    return this.send(settingsMap, {
      to,
      subject: `${siteName} — You're invited`,
      html: renderInviteEmail(settingsMap, {
        firstName,
        invitedByName,
        actionUrl: url,
      }),
    });
  }
}

export const mailService = new MailService();
