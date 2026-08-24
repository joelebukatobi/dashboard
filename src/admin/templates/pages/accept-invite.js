// src/admin/templates/pages/accept-invite.js

import { escapeHtml } from '../utils/helpers.js';

export function acceptInviteContent({ token, error = '' } = {}) {
  const errorHtml = error
    ? `<div class="alert alert--error" role="alert">${escapeHtml(error)}</div>`
    : '';

  return `
        <div class="login__container">
          <div class="auth-card">
            <div class="auth-card__header">
              <h1 class="auth-card__title">Accept invitation</h1>
              <p class="auth-card__subtitle">Set your password to activate your account</p>
            </div>

            <hr class="divider" />

            <div id="invite-response">
              ${errorHtml}
            </div>

            <form
              class="auth-card__form"
              hx-post="/admin/auth/accept-invite"
              hx-target="#invite-response"
              hx-swap="innerHTML"
            >
              <input type="hidden" name="token" value="${escapeHtml(token)}" />

              <div class="form__group">
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
                  <button type="button" class="input__addon" onclick="togglePassword()">
                    <i data-lucide="eye" id="password-icon"></i>
                  </button>
                </div>
              </div>

              <div class="form__group">
                <label class="label" for="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  class="input input--lg"
                  placeholder="Confirm your password"
                  minlength="8"
                  required
                />
              </div>

              <button type="submit" class="btn btn--primary btn--lg btn--full">Activate account</button>
            </form>

            <div class="auth-card__footer">
              <a href="/admin/auth/login">← Back to login</a>
            </div>
          </div>
        </div>
  `;
}

export function acceptInviteMeta(_options = {}) {
  return {
    title: 'Accept Invitation',
    description: 'Activate your dashboard account',
  };
}
