// src/admin/templates/utils/helpers.js
// Shared utility functions for templates

import { formatSiteDate } from '../../../lib/site-dates.js';
import { getRequestSettings } from '../../../lib/settings-context.js';
import { toPublicMediaUrl } from '../../../lib/media-paths.js';

export { toPublicMediaUrl };

/**
 * Get user initials from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} - Initials (e.g., "SM" for Sarah Miller)
 */
export function getInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Get initials from a full name by splitting on spaces
 * @param {string} name - Full name (e.g., "Sarah Miller")
 * @returns {string} - Initials (e.g., "SM")
 */
export function getNameInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date using site settings (timezone + dateFormat).
 * @param {Date|string} date
 * @param {string} [format] - Legacy short/medium/long; ignored when site settings are bound
 * @returns {string}
 */
export function formatDate(date, format = 'medium') {
  const settings = getRequestSettings();
  if (Object.keys(settings).length > 0) {
    return formatSiteDate(date, settings);
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const options = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
  };

  return d.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just Now';
  if (minutes < 60) return `${minutes} Minute${minutes > 1 ? 's' : ''} Ago`;
  if (hours < 24) return `${hours} Hour${hours > 1 ? 's' : ''} Ago`;
  if (days < 7) return `${days} Day${days > 1 ? 's' : ''} Ago`;

  return formatDate(date);
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} - Truncated text
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Get status badge class based on status
 * @param {string} status - Status value
 * @returns {string} - CSS class suffix (success, warning, danger, etc.)
 */
export function getStatusClass(status) {
  const map = {
    'ACTIVE': 'success',
    'PUBLISHED': 'success',
    'PUBLISH': 'success',
    'INVITED': 'warning',
    'DRAFT': 'warning',
    'SUSPENDED': 'danger',
    'DELETED': 'danger',
    'TRASH': 'danger',
    'PENDING': 'info',
    'SCHEDULED': 'info',
  };
  return map[status?.toUpperCase()] || 'grey';
}

// ============================================================================
// Filter Label Mappings
// Used to display human-readable labels for filter dropdowns
// ============================================================================

/**
 * Post status labels for filter dropdowns
 * Maps database/URL values to display labels
 */
export const POST_STATUS_LABELS = {
  'PUBLISHED': 'Published',
  'DRAFT': 'Draft',
  'SCHEDULED': 'Scheduled',
  'ARCHIVED': 'Archived',
};

/**
 * User role labels for filter dropdowns
 */
export const USER_ROLE_LABELS = {
  'ADMIN': 'Admin',
  'EDITOR': 'Editor',
  'AUTHOR': 'Author',
  'VIEWER': 'Viewer',
};

/**
 * User status labels for filter dropdowns
 */
export const USER_STATUS_LABELS = {
  'ACTIVE': 'Active',
  'INVITED': 'Invited',
  'SUSPENDED': 'Suspended',
};

/**
 * Subscriber status labels for filter dropdowns
 */
export const SUBSCRIBER_STATUS_LABELS = {
  'ACTIVE': 'Active',
  'PENDING': 'Pending',
  'UNSUBSCRIBED': 'Unsubscribed',
  'BOUNCED': 'Bounced',
};

// ============================================================================
// List page shared markup
// ============================================================================

/**
 * Build admin list pagination footer markup.
 * @param {Object} options
 * @param {string} options.basePath - e.g. '/admin/categories'
 * @param {number} options.page
 * @param {number} options.totalPages
 * @param {Record<string, string|undefined|null>} [options.filters]
 * @param {Array<string|{ filter: string, param: string }>} [options.filterKeys]
 * @returns {string}
 */
export function paginationHtml({ basePath, page, totalPages, filters = {}, filterKeys = ['search'] }) {
  const params = new URLSearchParams();

  for (const key of filterKeys) {
    if (typeof key === 'string') {
      if (filters?.[key]) params.set(key, filters[key]);
    } else if (filters?.[key.filter]) {
      params.set(key.param, filters[key.filter]);
    }
  }

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `${basePath}?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

  let pageNumbers = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (page <= 3) {
    pageNumbers = [1, 2, 3, 4, '...', totalPages];
  } else if (page >= totalPages - 2) {
    pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pageNumbers = [1, '...', page - 1, page, page + 1, '...', totalPages];
  }

  pageNumbers.forEach((p) => {
    if (p === '...') {
      links += '<span class="pagination__ellipsis">...</span>';
    } else {
      const active = p === page ? 'pagination__item--active' : '';
      links += `<a href="${basePath}?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `${basePath}?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}

/**
 * Inline script that shows a toast from a ?toast= query param.
 * @param {string|undefined|null} toast
 * @param {Record<string, string>} messages
 * @returns {string}
 */
export function toastQueryScript(toast, messages = {}) {
  if (!toast) return '';

  const messageMap = Object.entries(messages)
    .map(([key, message]) => `          ${JSON.stringify(key)}: ${JSON.stringify(message)}`)
    .join(',\n');

  return `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
${messageMap}
        };
        const message = toastMessages[${JSON.stringify(toast)}] || ${JSON.stringify(toast)};
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  `;
}
