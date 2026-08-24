// src/admin/templates/layouts/auth.js
// Auth layout for login, reset password, and other auth pages

import { assetUrl } from '../../../lib/asset-version.js';

/**
 * Auth Layout Template
 * Split-screen layout with branding panel and form panel
 * 
 * @param {Object} options
 * @param {string} options.title - Page title
 * @param {string} options.description - Meta description
 * @param {string} options.body - Main content to render in the form panel
 * @returns {string} Complete HTML page
 */
/**
 * Auth shell HTML (login split layout + scripts).
 * Used by authLayout (legacy) and fastify-html addLayout.
 */
export function buildAuthShell({
  title = 'Sign In',
  description = 'Sign in to your account',
  body,
  siteName = 'BlogCMS',
  favicon = '/favicon.svg',
  ogMeta = '',
}) {
  const safeTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const safeSiteName = String(siteName).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const safeDescription = String(description).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const safeFavicon = String(favicon).replace(/"/g, '&quot;');

  return `<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle} - ${safeSiteName}</title>
    <meta name="description" content="${safeDescription}" />
    ${ogMeta}

    <!-- Favicon -->
    <link rel="icon" href="${safeFavicon}" />

    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- Google Fonts - Schibsted Grotesk -->
    <link
      href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
      rel="stylesheet"
    />

    <!-- Compiled CSS -->
    <link rel="stylesheet" href="${assetUrl('/dist/css/admin.css')}" />

    <!-- HTMX -->
    <script src="${assetUrl('/dist/js/htmx.js')}"></script>

    <!-- Lucide Icons -->
    <script src="${assetUrl('/dist/js/lucide.js')}"></script>
  </head>
  <body>
    <!-- Admin Namespace Wrapper -->
    <div class="admin">
      <!-- Login Layout - Split screen -->
      <div class="login">
        <!-- Left side - Branding panel (hidden on mobile) -->
        <div class="login__branding"></div>

        <!-- Right side - Form panel (contains modals) -->
        <div class="login__form-panel" id="login-form-panel">
          ${body}
        </div>
      </div>
    </div>

    <!-- Preline JS -->
    <script src="${assetUrl('/dist/js/preline.js')}"></script>

    <!-- Initialize Lucide icons and handle theme -->
    <script>
      // Theme initialization for auth pages
      const html = document.documentElement;
      const savedTheme = localStorage.getItem('theme');

      if (savedTheme === null) {
        // First visit - check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          html.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          localStorage.setItem('theme', 'light');
        }
      } else if (savedTheme === 'dark') {
        // Returning visitor with saved preference
        html.classList.add('dark');
      }

      lucide.createIcons();

      function copyEmail() {
        navigator.clipboard.writeText('example@mail.com');
        alert('Email copied to clipboard!');
      }

      function togglePassword(inputId, iconId) {
        const passwordInput = document.getElementById(inputId || 'password');
        const passwordIcon = document.getElementById(iconId || 'password-icon');

        if (!passwordInput || !passwordIcon) {
          return;
        }

        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          passwordIcon.setAttribute('data-lucide', 'eye-off');
        } else {
          passwordInput.type = 'password';
          passwordIcon.setAttribute('data-lucide', 'eye');
        }

        lucide.createIcons();
      }

      // HTMX event handlers
      document.body.addEventListener('htmx:beforeSwap', function(evt) {
        const xhr = evt.detail.xhr;
        // Auth forms return 400 with inline error HTML; swap it into the target.
        if (xhr.status >= 400 && xhr.status < 500 && xhr.responseText) {
          evt.detail.shouldSwap = true;
          evt.detail.isError = false;
        }
      });

      document.body.addEventListener('htmx:afterSwap', function() {
        lucide.createIcons();
      });

      document.body.addEventListener('htmx:afterRequest', function(evt) {
        // Handle redirect from server
        const redirectUrl = evt.detail.xhr.getResponseHeader('HX-Redirect');
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      });
    </script>
  </body>
</html>`;
}
