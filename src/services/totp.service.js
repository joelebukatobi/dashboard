/**
 * TOTP enrollment and verification (otplib v13+).
 */

import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

/**
 * @param {string} email
 * @param {string} issuer
 * @returns {Promise<{ secret: string, uri: string, qrDataUrl: string }>}
 */
export async function createEnrollmentData(email, issuer) {
  const secret = generateSecret();
  const uri = generateURI({ issuer, label: email, secret });
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { secret, uri, qrDataUrl };
}

/**
 * Regenerate QR image for an existing TOTP secret (resume interrupted setup).
 * @param {string} email
 * @param {string} issuer
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function qrDataUrlFromSecret(email, issuer, secret) {
  const uri = generateURI({ issuer, label: email, secret });
  return QRCode.toDataURL(uri);
}

/**
 * @param {string} token - 6-digit code
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function verifyTotpCode(token, secret) {
  if (!token || !secret) return false;
  try {
    const result = await verify({ token: String(token).trim(), secret });
    return result.valid === true;
  } catch {
    return false;
  }
}
