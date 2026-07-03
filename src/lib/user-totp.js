/**
 * Normalize user TOTP flags from DB/driver (boolean, 0/1, string).
 */

import { isSettingEnabled } from '../services/settings.service.js';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUserTotpEnabled(value) {
  return value === true || value === 1 || value === 'true' || value === '1';
}

/**
 * @param {{ totpEnabled?: unknown, totpSecret?: string | null }} row
 * @returns {boolean}
 */
export function isUserTotpPending(row = {}) {
  return Boolean(row.totpSecret) && !isUserTotpEnabled(row.totpEnabled);
}

/**
 * Next step after a successful password login.
 * @param {{ role?: string, totpEnabled?: unknown } | null | undefined} user
 * @param {Record<string, unknown>} siteMap
 * @returns {'none' | 'verify' | 'setup'}
 */
export function getLoginTotpAction(user, siteMap = {}) {
  if (!user) return 'none';
  if (isUserTotpEnabled(user.totpEnabled)) return 'verify';
  if (user.role === 'ADMIN' && isSettingEnabled(siteMap.twoFactorAuth)) return 'setup';
  return 'none';
}

/**
 * Whether an admin may disable 2FA on their account.
 * @param {{ role?: string }} user
 * @param {Record<string, unknown>} siteMap
 * @returns {boolean}
 */
export function canDisableUserTotp(user, siteMap = {}) {
  if (user?.role === 'ADMIN' && isSettingEnabled(siteMap.twoFactorAuth)) {
    return false;
  }
  return true;
}
