// src/admin/templates/partials/sidebar.js
// Sidebar navigation component

import { escapeHtml } from '../utils/helpers.js';
import { projectNavItems, projectNavTitle } from '../../nav.project.js';

/**
 * Sidebar Partial
 * Displays navigation menu with logo, groups, and submenus
 *
 * @param {Object} options
 * @param {string} options.activeRoute - Currently active route for highlighting
 * @param {Object} [options.user] - Current user data (for future features)
 * @param {string} options.user.email - User email
 * @returns {string} Sidebar HTML
 */
/**
 * Renders the fork-owned sidebar group.
 * Returns an empty string when a fork supplies no items, so dashboard's
 * sidebar is byte-identical to what it rendered before this seam existed.
 *
 * @param {Object} options
 * @param {Array<{href: string, label: string, icon: string}>} options.items
 * @param {string} options.title - Group heading
 * @param {(route: string) => string} options.isActive
 * @returns {string} Sidebar group HTML, or ''
 */
export function renderProjectNav({ items = [], title = 'Project', isActive }) {
  if (items.length === 0) return '';

  const entries = items
    .map(
      (item) => `
            <li>
              <a href="${escapeHtml(item.href)}" class="sidebar__item ${isActive(item.href)}">
                <span class="sidebar__item-icon">
                  <i data-lucide="${escapeHtml(item.icon)}"></i>
                </span>
                <span class="sidebar__item-text">${escapeHtml(item.label)}</span>
              </a>
            </li>`,
    )
    .join('');

  return `
        <!-- Project Group -->
        <div class="sidebar__group sidebar__group--project">
          <div class="sidebar__group-title">${escapeHtml(title)}</div>
          <ul class="sidebar__menu">${entries}
          </ul>
        </div>`;
}

export function sidebar({ activeRoute = '/', user, siteName = 'BlogCMS', siteIcon = '' } = {}) {
  const isActive = (route) => {
    // Exact match for dashboard (just /admin or /admin/)
    if (route === '/admin') {
      return activeRoute === '/admin' || activeRoute === '/admin/' ? 'sidebar__item--active' : '';
    }
    // For other routes, check if activeRoute starts with the route
    return activeRoute.startsWith(route) ? 'sidebar__item--active' : '';
  };

  // A configured icon is rendered alongside a hidden fallback rather than
  // instead of it. The settings row and the uploaded file can drift apart —
  // a database restored without its uploads, or a fork inheriting settings —
  // and without this the sidebar shows a broken image rather than falling
  // back to the icon sitting right here.
  const logoIcon = siteIcon
    ? `<img src="${escapeHtml(siteIcon)}" alt="" class="sidebar__logo-icon-img"
           onerror="this.hidden = true; this.nextElementSibling.hidden = false;" />
       <span class="sidebar__logo-icon-fallback" hidden><i data-lucide="square-library"></i></span>`
    : `<i data-lucide="square-library"></i>`;

  return `
    <aside class="sidebar">
      <!-- Sidebar Header / Logo -->
      <div class="sidebar__header">
          <a href="/admin" class="sidebar__logo">
          <div class="sidebar__logo-icon">
            ${logoIcon}
          </div>
          <span class="sidebar__logo-text">${escapeHtml(siteName)}</span>
        </a>
        <!-- Desktop: Collapse toggle -->
        <button class="sidebar__toggle" id="sidebarToggle" title="Toggle sidebar">
          <i data-lucide="chevron-left" class="sidebar__toggle-icon"></i>
        </button>
        <!-- Mobile: Close button -->
        <button class="sidebar__close" id="sidebarClose" title="Close sidebar">
          <i data-lucide="chevron-left" class="sidebar__close-icon"></i>
        </button>
      </div>

      <!-- Sidebar Navigation -->
      <nav class="sidebar__nav">
        <!-- Main Navigation Group -->
        <div class="sidebar__group">
          <div class="sidebar__group-title">Main Menu</div>
          <ul class="sidebar__menu">
            <li>
              <a href="/admin" class="sidebar__item ${isActive('/admin')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="layout-dashboard"></i>
                </span>
                <span class="sidebar__item-text">Dashboard</span>
              </a>
            </li>
            <li>
              <a href="/admin/posts" class="sidebar__item ${isActive('/admin/posts')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="file-text"></i>
                </span>
                <span class="sidebar__item-text">Posts</span>
                <!-- <span class="sidebar__item-badge">12</span> -->
              </a>
            </li>
            <li>
              <a href="/admin/categories" class="sidebar__item ${isActive('/admin/categories')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="folder-open"></i>
                </span>
                <span class="sidebar__item-text">Categories</span>
              </a>
            </li>
            <li>
              <a href="/admin/tags" class="sidebar__item ${isActive('/admin/tags')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="tags"></i>
                </span>
                <span class="sidebar__item-text">Tags</span>
              </a>
            </li>
          </ul>
        </div>

        <!--
        OLD MEDIA DROPDOWN (for reference)
        <li>
          <div class="sidebar__item sidebar__item--has-submenu ${isActive('/admin/media') ? 'sidebar__item--active' : ''}">
            <span class="sidebar__item-icon">
              <i data-lucide="image"></i>
            </span>
            <span class="sidebar__item-text">Media</span>
            <span class="sidebar__item-arrow">
              <i data-lucide="chevron-right"></i>
            </span>
          </div>
          <ul class="sidebar__submenu ${isActive('/admin/media') ? 'sidebar__submenu--open' : ''}">
            <li>
              <a href="/admin/media/images" class="sidebar__submenu-item">Images</a>
            </li>
            <li>
              <a href="/admin/media/videos" class="sidebar__submenu-item">Videos</a>
            </li>
          </ul>
        </li>
        -->

        <!-- Media Group -->
        <div class="sidebar__group">
          <div class="sidebar__group-title">Media</div>
          <ul class="sidebar__menu">
            <li>
              <a href="/admin/media/images" class="sidebar__item ${isActive('/admin/media/images')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="image"></i>
                </span>
                <span class="sidebar__item-text">Images</span>
              </a>
            </li>
            <li>
              <a href="/admin/media/videos" class="sidebar__item ${isActive('/admin/media/videos')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="video"></i>
                </span>
                <span class="sidebar__item-text">Videos</span>
              </a>
            </li>
            <li>
              <a href="/admin/media/albums" class="sidebar__item ${isActive('/admin/media/albums')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="folder-open"></i>
                </span>
                <span class="sidebar__item-text">Albums</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Management Group -->
        <div class="sidebar__group">
          <div class="sidebar__group-title">Management</div>
          <ul class="sidebar__menu">
            <li>
              <a href="/admin/users" class="sidebar__item ${isActive('/admin/users')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="user-cog"></i>
                </span>
                <span class="sidebar__item-text">Users</span>
              </a>
            </li>
            <li>
              <a href="/admin/subscribers" class="sidebar__item ${isActive('/admin/subscribers')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="mail"></i>
                </span>
                <span class="sidebar__item-text">Subscribers</span>
              </a>
            </li>
            ${user?.role === 'ADMIN' ? `
            <li>
              <a href="/admin/settings" class="sidebar__item ${isActive('/admin/settings')}">
                <span class="sidebar__item-icon">
                  <i data-lucide="settings"></i>
                </span>
                <span class="sidebar__item-text">Settings</span>
              </a>
            </li>
            ` : ''}
          </ul>
        </div>${renderProjectNav({ items: projectNavItems, title: projectNavTitle, isActive })}
      </nav>
    </aside>
  `;
}
