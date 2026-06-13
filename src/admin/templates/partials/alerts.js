// src/admin/templates/partials/alerts.js
// Toast notification partials

import { escapeHtml } from '../utils/helpers.js';

/**
 * Success toast notification
 * @param {Object} options - Toast options
 * @param {string} options.message - Toast message
 * @returns {string} - HTML string
 */
export function successToast({ message }) {
  return `
    <div class="toast toast--success" role="alert">
      <div class="toast__icon">
        <i data-lucide="check-circle"></i>
      </div>
      <div class="toast__content">
        <p class="toast__message">${escapeHtml(message)}</p>
      </div>
    </div>
    <script>
      if (typeof showToast === 'function') {
        showToast(${JSON.stringify(message)}, 'success');
      }
    </script>
  `;
}

/**
 * Error toast notification
 * @param {Object} options - Toast options
 * @param {string} options.message - Toast message
 * @returns {string} - HTML string
 */
export function errorToast({ message }) {
  return `
    <div class="toast toast--error" role="alert">
      <div class="toast__icon">
        <i data-lucide="alert-circle"></i>
      </div>
      <div class="toast__content">
        <p class="toast__message">${escapeHtml(message)}</p>
      </div>
    </div>
    <script>
      if (typeof showToast === 'function') {
        showToast(${JSON.stringify(message)}, 'error');
      }
    </script>
  `;
}
