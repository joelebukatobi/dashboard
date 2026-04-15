// src/admin/templates/pages/login.js
// Login page template

import { authLayout } from '../layouts/auth.js';

/**
 * Login Page Template
 * 
 * @param {Object} options
 * @param {string} [options.error] - Error message to display
 * @param {string} [options.success] - Success message to display (e.g., after password reset)
 * @returns {string} Complete HTML page
 */
export function loginPage({ error = '', success = '' } = {}) {
  const errorHtml = error 
    ? `<div class="alert alert--danger" role="alert">${escapeHtml(error)}</div>` 
    : '';
  
  const successHtml = success 
    ? `<div class="alert alert--success" role="alert">${escapeHtml(success)}</div>` 
    : '';

  const body = `
        <div class="login__container">
          <!-- Auth Card -->
          <div class="auth-card">
            <div class="auth-card__header">
              <h1 class="auth-card__title">Welcome Back</h1>
              <p class="auth-card__subtitle">Sign in to your account to continue</p>
            </div>

            <!-- Error message area - always visible, fills with content on error -->
            <p id="login-error" class="auth-card__error">&nbsp;</p>

            <hr class="divider" />

            <!-- Login Form -->
            <form
              class="auth-card__form"
              hx-post="/admin/auth/login"
              hx-target="#login-error"
              hx-swap="innerHTML"
              novalidate
            >
              <!-- Email -->
              <div class="form__group">
                <label class="label" for="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="input input--lg"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <!-- Password with visibility toggle -->
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
                  <button type="button" class="input__addon" onclick="togglePassword()">
                    <i data-lucide="eye" id="password-icon"></i>
                  </button>
                </div>
              </div>

              <!-- Remember me & Forgot password -->
              <div class="auth-card__links">
                <div class="auth-card__remember">
                  <input type="checkbox" id="remember" name="rememberMe" value="true" />
                  <label for="remember">Remember Me</label>
                </div>
                <a href="#" data-hs-overlay="#forgot-password-modal">Forgot Password?</a>
              </div>

              <!-- Sign in button -->
              <button type="submit" class="btn btn--primary btn--xl btn--full">
                Sign In
              </button>
            </form>

            <!-- Divider -->
            <div class="auth-divider">
              <span class="auth-divider__text">or continue with</span>
            </div>

            <!-- Google SSO -->
            <a href="/admin/auth/google" class="social-btn social-btn--google">
              <span class="social-btn__icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              <span class="social-btn__text">Continue with Google</span>
            </a>

            <!-- Footer -->
            <div class="auth-card__footer">
              Don't have an account? <a href="#" data-hs-overlay="#request-access-modal">Request Access</a>
            </div>
          </div>
        </div>

        <!-- MODAL: Forgot Password -->
        <div
          id="forgot-password-modal"
          class="login__modal hs-overlay hidden"
          role="dialog"
          tabindex="-1"
          aria-labelledby="forgot-password-modal-label"
        >
          <div class="login__modal-backdrop"></div>
          <div class="login__modal-content">
            <div class="auth-card">
              <div class="auth-card__header">
                <h2 class="auth-card__title" id="forgot-password-modal-label">Reset password</h2>
                <p class="auth-card__subtitle">Enter your email and we'll send you a reset link</p>
              </div>

              <!-- Response area for forgot password -->
              <div id="forgot-password-response"></div>

              <form 
                class="auth-card__form"
                hx-post="/admin/auth/forgot-password"
                hx-target="#forgot-password-response"
                hx-swap="innerHTML"
              >
                <div class="form__group">
                  <label class="label" for="reset-email">Email address</label>
                  <input
                    type="email"
                    id="reset-email"
                    name="email"
                    class="input input--lg"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button type="submit" class="btn btn--primary btn--xl btn--full">Send reset link</button>
              </form>

              <div class="auth-card__footer">
                <a href="#" data-hs-overlay="#forgot-password-modal">← Back to login</a>
              </div>
            </div>
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

  return authLayout({
    title: 'Sign In',
    description: 'Sign in to your BlogCMS Dashboard account',
    body
  });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
