// src/admin/controllers/setup.controller.js
// Handles setup wizard logic

import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { renderAdminPage } from '../render.js';
import { setupWizardContent, setupWizardMeta } from '../templates/pages/setup-wizard.js';

export function renderSetupPage(request, reply, options) {
  const step = options.step ?? 'form';
  return renderAdminPage(
    request,
    reply,
    setupWizardMeta({ step }),
    setupWizardContent({ step, ...options }),
  );
}

/**
 * Display setup wizard form
 */
export async function showSetupForm(request, reply) {
  const { expiresIn } = request.setupToken;

  return renderSetupPage(request, reply, {
    step: 'form',
    token: request.query.token,
    expiresIn,
    error: null,
    values: {},
  });
}

/**
 * Process setup form submission
 */
export async function processSetup(request, reply) {
  const { db, users, setupTokens } = await import('../../db/index.js');
  const { id: tokenId, plainToken, expiresIn } = request.setupToken;

  const { firstName, lastName, email, password, demoData } = request.body;

  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return renderSetupPage(request, reply, {
        step: 'form',
        token: plainToken,
        expiresIn,
        error: 'An account with this email already exists. Please log in.',
        errors: {},
        values: { firstName, lastName, email, demoData },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db
      .update(setupTokens)
      .set({ usedAt: new Date() })
      .where(eq(setupTokens.id, tokenId));

    if (demoData === 'on' || demoData === 'true') {
      try {
        const { seedDemoData } = await import('../../../scripts/seed.js');
        await seedDemoData({ skipAdmin: true });
      } catch (seedError) {
        request.log.error('Demo data seeding error:', seedError);
      }
    }

    return reply.redirect('/admin/auth/login?setup=success');
  } catch (error) {
    request.log.error('Setup error:', error);
    return renderSetupPage(request, reply, {
      step: 'form',
      token: plainToken,
      expiresIn,
      error: 'An error occurred while creating your account. Please try again.',
      errors: {},
      values: { firstName, lastName, email, demoData },
    });
  }
}
