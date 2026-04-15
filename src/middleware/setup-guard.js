// src/middleware/setup-guard.js
// Validates setup tokens for the setup wizard

import { eq, and, isNull, gt } from 'drizzle-orm';
import crypto from 'crypto';
import setupWizard from '../admin/templates/pages/setup-wizard.js';

export async function validateSetupToken(request, reply) {
  const token = request.query.token;

  // No token provided - redirect to homepage
  if (!token) {
    return reply.redirect('/');
  }

  try {
    const { db, setupTokens } = await import('../db/index.js');

    // Hash the token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token: matches hash, not used, not expired
    const [setupToken] = await db
      .select()
      .from(setupTokens)
      .where(
        and(
          eq(setupTokens.tokenHash, tokenHash),
          isNull(setupTokens.usedAt),
          gt(setupTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!setupToken) {
      // Check if token exists but is used
      const [usedToken] = await db
        .select()
        .from(setupTokens)
        .where(eq(setupTokens.tokenHash, tokenHash))
        .limit(1);

      if (usedToken?.usedAt) {
        return reply.type('text/html').send(setupWizard({
          error: 'Setup has already been completed. Please log in.',
          step: 'error',
          token: null,
          expiresIn: null
        }));
      }

      // Token invalid or expired
      return reply.type('text/html').send(setupWizard({
        error: 'Invalid or expired setup token. Please request a new one.',
        step: 'error',
        token: null,
        expiresIn: null
      }));
    }

    // Calculate time remaining
    const expiresAt = new Date(setupToken.expiresAt);
    const now = new Date();
    const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000)); // seconds

    // Attach token info to request
    request.setupToken = {
      id: setupToken.id,
      plainToken: token,
      expiresIn
    };

  } catch (error) {
    request.log.error('Token validation error:', error);
    return reply.type('text/html').send(setupWizard({
      error: 'An error occurred. Please try again.',
      step: 'error',
      token: null,
      expiresIn: null
    }));
  }
}
