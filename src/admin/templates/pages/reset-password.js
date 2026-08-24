// src/admin/templates/pages/reset-password.js
// Reset password page template

import { escapeHtml } from '../utils/helpers.js';

/**
 * Reset password page inner content (layout applied via fastify-html addLayout).
 *
 * @param {Object} options
 * @param {string} options.token - Password reset token
 * @param {string} [options.error] - Error message to display
 * @returns {string} Inner HTML for the reset password form panel
 */
export function resetPasswordContent({ token, error = '' } = {}) {
  const errorHtml = error
    ? `<div class="alert alert--error" role="alert">${escapeHtml(error)}</div>`
    : '';

  return `
        <div class="login__container">
          <!-- Auth Card -->
          <div class="auth-card">
            <div class="auth-card__header">
              <h1 class="auth-card__title">Reset Password</h1>
              <p class="auth-card__subtitle">Enter your new password below</p>
            </div>

            <hr class="divider" />

            <!-- Response area for HTMX -->
            <div id="reset-response">
              ${errorHtml}
            </div>

            <!-- Reset Password Form -->
            <form 
              class="auth-card__form"
              hx-post="/admin/auth/reset-password"
              hx-target="#reset-response"
              hx-swap="innerHTML"
            >
              <!-- Hidden token field -->
              <input type="hidden" name="token" value="${escapeHtml(token)}" />

              <!-- New Password -->
              <div class="form__group">
                <label class="label" for="password">New Password</label>
                <div class="form__wrapper">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    class="input input--lg input--icon-right"
                    placeholder="Enter new password"
                    minlength="8"
                    required
                  />
                  <button type="button" class="input__addon" onclick="togglePassword('password', 'password-icon')">
                    <i data-lucide="eye" id="password-icon"></i>
                  </button>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="form__group">
                <label class="label" for="confirmPassword">Confirm Password</label>
                <div class="form__wrapper">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    class="input input--lg input--icon-right"
                    placeholder="Confirm new password"
                    minlength="8"
                    required
                  />
                  <button type="button" class="input__addon" onclick="togglePassword('confirmPassword', 'confirmPassword-icon')">
                    <i data-lucide="eye" id="confirmPassword-icon"></i>
                  </button>
                </div>
              </div>

              <!-- Submit button -->
              <button type="submit" class="btn btn--primary btn--xl btn--full">Reset Password</button>
            </form>

            <!-- Footer -->
            <div class="auth-card__footer">
              <a href="/admin/auth/login">← Back to login</a>
            </div>
          </div>
        </div>
  `;
}

/**
 * Reset password page metadata for fastify-html addLayout.
 *
 * @param {Object} [_options]
 * @returns {{ title: string, description: string }}
 */
export function resetPasswordMeta(_options = {}) {
  return {
    title: 'Reset Password',
    description: 'Reset your BlogCMS Dashboard password',
  };
}
