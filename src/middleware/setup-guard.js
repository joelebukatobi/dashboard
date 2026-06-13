// src/middleware/setup-guard.js
// Validates setup tokens for the setup wizard

import { eq, and, isNull, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { setTemplateMeta } from '../admin/render.js';
import { setupWizardContent, setupWizardMeta } from '../admin/templates/pages/setup-wizard.js';

function renderSetupError(request, reply, error) {
  setTemplateMeta(request, setupWizardMeta({ step: 'error' }));
  return reply.html`!${setupWizardContent({
    step: 'error',
    error,
    token: null,
    expiresIn: null,
  })}`;
}

export async function validateSetupToken(request, reply) {
  const token = request.query.token;

  if (!token) {
    return reply.redirect('/');
  }

  try {
    const { db, setupTokens } = await import('../db/index.js');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [setupToken] = await db
      .select()
      .from(setupTokens)
      .where(
        and(
          eq(setupTokens.tokenHash, tokenHash),
          isNull(setupTokens.usedAt),
          gt(setupTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!setupToken) {
      const [usedToken] = await db
        .select()
        .from(setupTokens)
        .where(eq(setupTokens.tokenHash, tokenHash))
        .limit(1);

      if (usedToken?.usedAt) {
        return renderSetupError(request, reply, 'Setup has already been completed. Please log in.');
      }

      return renderSetupError(request, reply, 'Invalid or expired setup token. Please request a new one.');
    }

    const expiresAt = new Date(setupToken.expiresAt);
    const now = new Date();
    const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));

    request.setupToken = {
      id: setupToken.id,
      plainToken: token,
      expiresIn,
    };
  } catch (error) {
    request.log.error('Token validation error:', error);
    return renderSetupError(request, reply, 'An error occurred. Please try again.');
  }
}
