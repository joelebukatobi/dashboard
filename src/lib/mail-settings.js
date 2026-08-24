import { decryptSecret } from './secret-crypto.js';

export const SMTP_SECURE_OPTIONS = [
  { value: 'tls', label: 'STARTTLS (port 587)' },
  { value: 'ssl', label: 'SSL (port 465)' },
  { value: 'none', label: 'None' },
];

/**
 * Normalize SMTP/mail settings from the settings map.
 * @param {Record<string, unknown>} map
 * @returns {{
 *   configured: boolean,
 *   host: string,
 *   port: number,
 *   secure: boolean,
 *   requireTLS: boolean,
 *   user: string,
 *   pass: string,
 *   fromName: string,
 *   fromAddress: string,
 *   replyTo: string,
 * }}
 */
export function getMailSettings(map = {}) {
  const host = String(map.smtpHost || '').trim();
  const port = Number(map.smtpPort) || 587;
  const secureMode = String(map.smtpSecure || 'tls').toLowerCase();
  const user = String(map.smtpUser || '').trim();
  const pass = decryptSecret(String(map.smtpPassword || ''));
  const fromName = String(map.emailFromName || map.siteName || 'Dashboard').trim();
  const fromAddress = String(map.emailFromAddress || user).trim();
  const replyTo = String(map.emailReplyTo || '').trim();

  const secure = secureMode === 'ssl';
  const requireTLS = secureMode === 'tls';
  const configured = Boolean(host && port && fromAddress);

  return {
    configured,
    host,
    port,
    secure,
    requireTLS,
    user,
    pass,
    fromName,
    fromAddress,
    replyTo,
  };
}

export function formatMailFrom(settings) {
  if (settings.fromName && settings.fromAddress) {
    return `"${settings.fromName.replace(/"/g, '\\"')}" <${settings.fromAddress}>`;
  }
  return settings.fromAddress;
}
