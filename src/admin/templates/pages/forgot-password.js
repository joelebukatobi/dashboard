// src/admin/templates/pages/forgot-password.js

import { escapeHtml, fieldErrorHtml } from '../utils/helpers.js';

/**
 * @param {{ email?: string, errors?: Record<string, string>, success?: string, alert?: string }} options
 */
export function forgotPasswordForm({ email = '', errors = {} }) {
  const emailGroupClass = errors.email ? 'form__group form__group--error' : 'form__group';

  return `
            <form
              id="forgot-password-form"
              class="auth-card__form"
              hx-post="/admin/auth/forgot-password"
              hx-target="#forgot-password-panel"
              hx-select="#forgot-password-panel"
              hx-swap="outerHTML"
            >
              <div class="${emailGroupClass}">
                <label class="label" for="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="input input--lg"
                  placeholder="you@example.com"
                  value="${escapeHtml(email)}"
                  required
                />
                ${fieldErrorHtml(errors.email)}
              </div>

              <button type="submit" class="btn btn--primary btn--xl btn--full">Send Reset Link</button>
            </form>
  `;
}

/**
 * @param {{ email?: string, errors?: Record<string, string>, success?: string, alert?: string }} options
 */
export function forgotPasswordPanel({ email = '', errors = {}, success = '', alert = '' }) {
  const successHtml = success
    ? `<div class="alert alert--success alert--mb" role="status">${escapeHtml(success)}</div>`
    : '';
  const alertHtml = alert
    ? `<div class="alert alert--error alert--mb" role="alert">${escapeHtml(alert)}</div>`
    : '';

  return `
        <div class="login__container" id="forgot-password-panel">
          <div class="auth-card">
            <div class="auth-card__header">
              <h1 class="auth-card__title">Forgot Password</h1>
              <p class="auth-card__subtitle">Enter your email and we'll send you a reset link</p>
            </div>

            <hr class="divider" />

            <div id="forgot-password-response">
              ${alertHtml}
              ${successHtml}
            </div>

            ${success ? '' : forgotPasswordForm({ email, errors })}

            <div class="auth-card__footer">
              <a href="/admin/auth/login">← Back to login</a>
            </div>
          </div>
        </div>
  `;
}

export function forgotPasswordContent(options = {}) {
  return forgotPasswordPanel(options);
}

export function forgotPasswordMeta(_options = {}) {
  return {
    title: 'Forgot Password',
    description: 'Request a password reset link for your dashboard account',
  };
}
