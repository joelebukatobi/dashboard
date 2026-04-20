// src/admin/templates/utils/helpers.js
// Shared utility functions for templates

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
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format style (short, medium, long)
 * @returns {string} - Formatted date
 */
export function formatDate(date, format = 'medium') {
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
