// src/admin/controllers/setup.controller.js
// Handles setup wizard logic

import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import setupWizard from '../templates/pages/setup-wizard.js';

/**
 * Display setup wizard form
 */
export async function showSetupForm(request, reply) {
  const { expiresIn } = request.setupToken;

  return reply.type('text/html').send(setupWizard({
    step: 'form',
    token: request.query.token,
    expiresIn,
    error: null,
    values: {}
  }));
}

/**
 * Process setup form submission
 */
export async function processSetup(request, reply) {
  const { db, users, setupTokens } = await import('../../db/index.js');
  const { id: tokenId, plainToken, expiresIn } = request.setupToken;

  const { firstName, lastName, email, password, confirmPassword, demoData } = request.body;

  // Validation
  const errors = {};

  if (!firstName || firstName.trim().length < 2) {
    errors.firstName = 'First name is required (min 2 characters)';
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.lastName = 'Last name is required (min 2 characters)';
  }

  if (!email || !isValidEmail(email)) {
    errors.email = 'Valid email is required';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!isValidPassword(password)) {
    errors.password = 'Password must contain uppercase, lowercase, number, and special character';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // If validation errors, re-render form
  if (Object.keys(errors).length > 0) {
    return reply.type('text/html').send(setupWizard({
      step: 'form',
      token: plainToken,
      expiresIn,
      error: null,
      errors,
      values: { firstName, lastName, email, demoData }
    }));
  }

  try {
    // Check if email already exists (shouldn't happen if no users, but safety check)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return reply.type('text/html').send(setupWizard({
        step: 'form',
        token: plainToken,
        expiresIn,
        error: 'An account with this email already exists. Please log in.',
        errors: {},
        values: { firstName, lastName, email, demoData }
      }));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
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
      updatedAt: new Date()
    });

    // Mark token as used
    await db
      .update(setupTokens)
      .set({ usedAt: new Date() })
      .where(eq(setupTokens.id, tokenId));

    // Seed demo data if requested
    if (demoData === 'on' || demoData === 'true') {
      try {
        const { seedDemoData } = await import('../../../scripts/seed.js');
        await seedDemoData({ skipAdmin: true });
      } catch (seedError) {
        request.log.error('Demo data seeding error:', seedError);
        // Don't fail setup if seeding fails, just log it
      }
    }

    // Redirect to login with success message
    return reply.redirect('/admin/auth/login?setup=success');

  } catch (error) {
    request.log.error('Setup error:', error);
    return reply.type('text/html').send(setupWizard({
      step: 'form',
      token: plainToken,
      expiresIn,
      error: 'An error occurred while creating your account. Please try again.',
      errors: {},
      values: { firstName, lastName, email, demoData }
    }));
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one uppercase
 * - At least one lowercase
 * - At least one number
 * - At least one special character
 */
function isValidPassword(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}
