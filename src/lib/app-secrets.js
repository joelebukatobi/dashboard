// src/lib/app-secrets.js
// Single source for the secret used to sign JWTs and encrypt stored settings.
// Both must agree: a token signed with one value cannot be verified with
// another, and settings encrypted under one key cannot be decrypted under a
// different one.
//
// One secret, one name. An earlier APP_ENCRYPTION_KEY alias implied that
// signing and encryption used separate keys when they never did — which gave
// neither the clarity of a single name nor the safety of real key separation.

export const FALLBACK_APP_SECRET = 'dev-secret-change-in-production';

/**
 * @returns {string} The application secret.
 * @throws {Error} In production when no secret is configured.
 */
export function getAppSecret() {
  const configured = process.env.JWT_SECRET;

  if (!configured) {
    // Dashboard is a base template. A fork that forgets this variable would
    // otherwise sign sessions with a value published in this repository, so
    // production refuses to start rather than doing that silently.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET is required in production. ' +
          'Set it in your hosting environment before deploying.',
      );
    }
    return FALLBACK_APP_SECRET;
  }

  return String(configured).trim();
}
