// src/admin/templates/partials/header.js
// Header component with user menu

import { getInitials } from '../utils/helpers.js';

/**
 * Header Partial
 * Displays top navigation bar with mobile menu toggle, theme toggle,
 * and user dropdown
 *
 * @param {Object} options
 * @param {Object} options.user - Current user data
 * @param {string} options.user.firstName - User's first name
 * @param {string} options.user.lastName - User's last name
 * @param {string} options.user.email - User's email
 * @param {string} options.user.avatarUrl - User's avatar URL
 * @returns {string} Header HTML
 */
export function header({ user, breadcrumbs = [] }) {
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0]
    : 'User';
  const avatarUrl = user?.avatarUrl;

  // Generate breadcrumb HTML with chevrons
  const breadcrumbHtml =
    breadcrumbs.length > 0
      ? breadcrumbs
          .map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const separator =
              index > 0 ? '<span class="breadcrumb__separator"><i data-lucide="chevron-right"></i></span>' : '';
            return `${separator}<a href="${crumb.url}" class="breadcrumb__item ${isLast ? 'breadcrumb__item--current' : ''}">${crumb.label}</a>`;
          })
          .join('')
      : '<a href="/admin" class="breadcrumb__item breadcrumb__item--current">Dashboard</a>';

  return `
    <header class="header">
      <div class="header__left">
        <button class="header__menu-toggle" id="mobileMenuToggle">
          <i data-lucide="menu"></i>
        </button>

        <!-- Breadcrumb (hidden on mobile) -->
        <nav class="breadcrumb">
          ${breadcrumbHtml}
        </nav>
      </div>

      <div class="header__right">
        <!-- Theme Toggle -->
        <button class="header__action" id="themeToggle" title="Toggle theme">
          <i data-lucide="sun" class="theme-icon-light"></i>
          <i data-lucide="moon" class="theme-icon-dark"></i>
        </button>

        <!-- Notifications - Commented out for now
        <div class="hs-dropdown hs-dropdown--bottom-right" id="notifications-dropdown" data-user-id="${user?.id || ''}">
          <button
            id="hs-dropdown-notifications"
            type="button"
            class="hs-dropdown-toggle header__action header__action--badge"
            data-count="0"
          >
            <i data-lucide="bell"></i>
          </button>
          <div
            class="hs-dropdown-menu dropdown__menu dropdown__menu--lg"
            role="menu"
            aria-labelledby="hs-dropdown-notifications"
          >
            <div class="notifications__header">
              <a href="#" class="notifications__action" onclick="markAllNotificationsRead(event)">Mark all as read</a>
              <button class="notifications__reload" onclick="fetchNotifications(); return false;" title="Refresh notifications">
                <i data-lucide="refresh-cw"></i>
              </button>
            </div>
            <div class="notifications__list" id="notifications-list">
              <div class="notifications__empty">Loading...</div>
            </div>
          </div>
        </div>
        -->

        <!-- User Menu -->
        <div class="hs-dropdown hs-dropdown--bottom-right">
          <button id="hs-dropdown-user" type="button" class="hs-dropdown-toggle header__user-btn">
            ${avatarUrl
              ? `<img src="${avatarUrl}" alt="${displayName}" class="avatar avatar--sm" />`
              : `<div class="avatar avatar--sm avatar--initials">${getInitials(user?.firstName, user?.lastName)}</div>`
            }
            <span class="header__user-name">${displayName}</span>
            <i data-lucide="chevron-down" class="dropdown__chevron"></i>
          </button>
          <div
            class="hs-dropdown-menu dropdown__menu dropdown__menu--md"
            role="menu"
            aria-labelledby="hs-dropdown-user"
          >
            <div class="dropdown__header">
              <p class="dropdown__header-name">${displayName}</p>
              <p class="dropdown__header-email">${user?.email || ''}</p>
            </div>
            <a class="dropdown__item" href="/admin/users/${user?.id}/edit">
              <i data-lucide="user"></i>
              My Profile
            </a>
            ${user?.role === 'ADMIN' ? `
            <a class="dropdown__item" href="/admin/settings">
              <i data-lucide="settings"></i>
              Settings
            </a>
            ` : ''}
            <div class="dropdown__divider"></div>
            <a class="dropdown__item dropdown__item--danger" href="#" onclick="handleLogout()">
              <i data-lucide="log-out"></i>
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </header>
  `;
}
