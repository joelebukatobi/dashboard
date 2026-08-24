// src/admin/templates/pages/login.js
// Login page template

import { escapeHtml } from '../utils/helpers.js';

/**
 * Login card — swapped into #login-panel via HTMX.
 * @param {{ error?: string, email?: string, rememberMe?: boolean }} [options]
 */
export function loginPanelContent({ error = '', email = '', rememberMe = false } = {}) {
  const alertHtml = error
    ? `<div class="alert alert--error alert--mb" role="alert">${escapeHtml(error)}</div>`
    : '';

  return `
    <div class="auth-card">
      <div class="auth-card__header">
        <h1 class="auth-card__title">Welcome Back</h1>
        <p class="auth-card__subtitle">Sign in to your account to continue</p>
      </div>

      <hr class="divider" />

      <div id="login-response">
        ${alertHtml}
      </div>

      <form
        class="auth-card__form"
        hx-post="/admin/auth/login"
        hx-target="#login-panel"
        hx-swap="innerHTML"
        novalidate
      >
        <div class="form__group">
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
        </div>

        <div class="form__group">
          <label class="label" for="password">Password</label>
          <div class="form__wrapper">
            <input
              type="password"
              id="password"
              name="password"
              class="input input--lg input--icon-right"
              placeholder="Enter your password"
              required
            />
            <button type="button" class="input__addon" onclick="togglePassword('password', 'password-icon')">
              <i data-lucide="eye" id="password-icon"></i>
            </button>
          </div>
        </div>

        <div class="auth-card__links">
          <div class="auth-card__remember">
            <input
              type="checkbox"
              id="remember"
              name="rememberMe"
              value="true"
              ${rememberMe ? 'checked' : ''}
            />
            <label for="remember">Remember Me</label>
          </div>
          <a href="/admin/auth/forgot-password">Forgot Password?</a>
        </div>

        <button type="submit" class="btn btn--primary btn--xl btn--full">
          Sign In
        </button>
      </form>

      <div class="auth-card__footer">
        Don't have an account? <a href="#" data-hs-overlay="#request-access-modal">Request Access</a>
      </div>
    </div>
  `;
}

/**
 * Login page inner content (layout applied via fastify-html addLayout).
 * @param {{ flashMessage?: string }} [options]
 */
export function loginContent({ flashMessage = '' } = {}) {
  const flashHtml = flashMessage
    ? `<div class="alert alert--success alert--mb" role="status">${escapeHtml(flashMessage)}</div>`
    : '';

  return `
        <div class="login__container">
          <div id="login-panel">
            ${flashHtml}
            ${loginPanelContent()}
          </div>
        </div>

        <!-- MODAL: Request Access -->
        <div
          id="request-access-modal"
          class="login__modal hs-overlay hidden"
          role="dialog"
          tabindex="-1"
          aria-labelledby="request-access-modal-label"
        >
          <div class="login__modal-backdrop"></div>
          <div class="login__modal-content">
            <div class="auth-card">
              <div class="auth-card__info">
                <div class="auth-card__info-icon">
                  <i data-lucide="lock"></i>
                </div>
                <h2 class="auth-card__info-title" id="request-access-modal-label">Access Restricted</h2>
                <p class="auth-card__info-text">
                  Access to this dashboard is restricted. Please contact the administrator to request an account.
                </p>
                <button class="auth-card__email-btn" onclick="copyEmail()">
                  <i data-lucide="mail"></i>
                  <span>example@mail.com</span>
                  <i data-lucide="copy"></i>
                </button>
                <div class="auth-card__footer">
                  <a href="#" data-hs-overlay="#request-access-modal">← Back to login</a>
                </div>
              </div>
            </div>
          </div>
        </div>
  `;
}

export function loginMeta(_options = {}) {
  return {
    title: 'Sign In',
    description: 'Sign in to your BlogCMS Dashboard account',
  };
}

export function totpMeta() {
  return {
    title: 'Two-Factor Authentication',
    description: 'Enter your authenticator code to continue',
  };
}

/**
 * Full TOTP page content (auth layout).
 * @param {{ error?: string }} [options]
 */
export function totpPageContent({ error = '' } = {}) {
  return `
    <div class="login__container">
      <div id="login-panel">
        ${totpStepContent({ error })}
      </div>
    </div>
  `;
}

/**
 * TOTP verification card.
 */
export function totpStepContent({ error = '' } = {}) {
  const alertHtml = error
    ? `<div class="alert alert--error alert--mb" role="alert">${escapeHtml(error)}</div>`
    : '';

  return `
    <div class="auth-card">
      <div class="auth-card__header">
        <h1 class="auth-card__title">Two-Factor Authentication</h1>
        <p class="auth-card__subtitle">Enter the 6-digit code from your authenticator app</p>
      </div>

      <hr class="divider" />

      <div id="login-response">
        ${alertHtml}
      </div>

      <form
        class="auth-card__form"
        method="post"
        action="/admin/auth/verify-totp"
        novalidate
      >
        <div class="form__group">
          <label class="label" for="totp-code">Authentication code</label>
          <input
            type="text"
            id="totp-code"
            name="code"
            class="input input--lg"
            placeholder="000000"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
            required
            autofocus
          />
        </div>

        <button type="submit" class="btn btn--primary btn--xl btn--full">
          Verify
        </button>
      </form>

      <div class="auth-card__footer">
        <a href="/admin/auth/login">← Back to login</a>
      </div>
    </div>
  `;
}

export function totpSetupMeta() {
  return {
    title: 'Set Up Two-Factor Authentication',
    description: 'Configure your authenticator app to continue',
  };
}

/**
 * Mandatory admin 2FA setup page (auth layout).
 * @param {{ qrDataUrl?: string, error?: string }} [options]
 */
export function totpSetupPageContent({ qrDataUrl = '', error = '' } = {}) {
  return `
    <div class="login__container">
      <div id="login-panel">
        ${totpSetupStepContent({ qrDataUrl, error })}
      </div>
    </div>
  `;
}

/**
 * Admin mandatory setup card shown after password login.
 */
export function totpSetupStepContent({ qrDataUrl = '', error = '' } = {}) {
  const alertHtml = error
    ? `<div class="alert alert--error alert--mb" role="alert">${escapeHtml(error)}</div>`
    : '';

  const qrBlock = qrDataUrl
    ? `<div class="totp-setup__qr"><img src="${escapeHtml(qrDataUrl)}" alt="2FA QR code" width="200" height="200" /></div>`
    : '';

  return `
    <div class="auth-card">
      <div class="auth-card__header">
        <h1 class="auth-card__title">Set Up Two-Factor Authentication</h1>
        <p class="auth-card__subtitle">Admin login requires an authenticator app. Scan the QR code, then enter your verification code.</p>
      </div>

      <hr class="divider" />

      <div id="login-response">
        ${alertHtml}
      </div>

      <div class="totp-setup">
        ${qrBlock}
        <form
          class="auth-card__form"
          method="post"
          action="/admin/auth/totp-setup/verify"
          novalidate
        >
          <div class="form__group">
            <label class="label" for="totp-setup-code">Verification code</label>
            <input
              type="text"
              id="totp-setup-code"
              name="code"
              class="input input--lg"
              placeholder="000000"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              autocomplete="one-time-code"
              required
              autofocus
            />
          </div>

          <button type="submit" class="btn btn--primary btn--xl btn--full">
            Verify &amp; Continue
          </button>
        </form>
      </div>

      <div class="auth-card__footer">
        <a href="/admin/auth/totp-setup?reset=true">Start over with a new QR code</a>
      </div>
    </div>
  `;
}
