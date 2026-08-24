// src/admin/templates/pages/accept-invite.js

import { escapeHtml, fieldErrorHtml } from '../utils/helpers.js';

/**
 * @param {{ token: string, errors?: Record<string, string> }} options
 */
export function acceptInviteForm({ token, errors = {} }) {
  const passwordGroupClass = errors.password ? 'form__group form__group--error' : 'form__group';
  const confirmGroupClass = errors.confirmPassword ? 'form__group form__group--error' : 'form__group';

  return `
            <form
              id="accept-invite-form"
              class="auth-card__form"
              hx-post="/admin/auth/accept-invite"
              hx-target="#accept-invite-panel"
              hx-select="#accept-invite-panel"
              hx-swap="outerHTML"
            >
              <input type="hidden" name="token" value="${escapeHtml(token)}" />

              <div class="${passwordGroupClass}">
                <label class="label" for="password">Password</label>
                <div class="form__wrapper">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    class="input input--lg input--icon-right"
                    placeholder="Create your password"
                    minlength="8"
                    required
                  />
                  <button type="button" class="input__addon" onclick="togglePassword('password', 'password-icon')">
                    <i data-lucide="eye" id="password-icon"></i>
                  </button>
                </div>
                ${fieldErrorHtml(errors.password)}
              </div>

              <div class="${confirmGroupClass}">
                <label class="label" for="confirmPassword">Confirm Password</label>
                <div class="form__wrapper">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    class="input input--lg input--icon-right"
                    placeholder="Confirm your password"
                    minlength="8"
                    required
                  />
                  <button type="button" class="input__addon" onclick="togglePassword('confirmPassword', 'confirmPassword-icon')">
                    <i data-lucide="eye" id="confirmPassword-icon"></i>
                  </button>
                </div>
                ${fieldErrorHtml(errors.confirmPassword)}
              </div>

              <button type="submit" class="btn btn--primary btn--xl btn--full">Activate Account</button>
            </form>
  `;
}

/**
 * @param {{ token: string, alert?: string, success?: string, errors?: Record<string, string> }} options
 */
export function acceptInvitePanel({ token, alert = '', success = '', errors = {} }) {
  const alertHtml = alert
    ? `<div class="alert alert--error alert--mb" role="alert">${escapeHtml(alert)}</div>`
    : '';
  const successHtml = success
    ? `<div class="alert alert--success alert--mb" role="status">${escapeHtml(success)}</div>`
    : '';

  return `
        <div class="login__container" id="accept-invite-panel">
          <div class="auth-card">
            <div class="auth-card__header">
              <h1 class="auth-card__title">Accept Invitation</h1>
              <p class="auth-card__subtitle">Set your password to activate your account</p>
            </div>

            <hr class="divider" />

            <div id="invite-response">
              ${alertHtml}
              ${successHtml}
            </div>

            ${acceptInviteForm({ token, errors })}

            <div class="auth-card__footer">
              <a href="/admin/auth/login">← Back to login</a>
            </div>
          </div>
        </div>
  `;
}

export function acceptInviteContent({ token, error = '', errors = {} } = {}) {
  return acceptInvitePanel({ token, alert: error, errors });
}

export function acceptInviteMeta(_options = {}) {
  return {
    title: 'Accept Invitation',
    description: 'Activate your dashboard account',
  };
}
