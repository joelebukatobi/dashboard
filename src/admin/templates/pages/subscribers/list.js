// src/admin/templates/pages/subscribers/list.js
// Subscribers List Page - Matches Posts structure exactly

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { formatRelativeTime } from '../../utils/helpers.js';

const listToolbarClass = 'mb-[1.6rem] flex shrink-0 flex-col gap-[1.6rem] sm:flex-row sm:items-center';
const listToolbarSearchClass = 'relative min-w-0 flex-1';
const listToolbarSearchIconClass = 'pointer-events-none absolute left-[1rem] top-1/2 h-[1.6rem] w-[1.6rem] -translate-y-1/2 text-grey-400 dark:text-grey-500';
const listToolbarInputClass = 'h-[3.2rem] w-full rounded-md border border-grey-100/50 bg-white px-[1.2rem] pl-[4.4rem] text-body-sm text-grey-900 outline-none transition-all duration-200 placeholder:text-body-sm placeholder:text-grey-400 hover:border-grey-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-grey-700 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-500 dark:hover:border-grey-600';
const listToolbarControlsClass = 'flex flex-wrap items-center gap-[1.2rem]';
const listToolbarDropdownClass = 'relative';
const listToolbarDropdownTriggerClass = 'inline-flex h-[3.2rem] items-center gap-[0.6rem] rounded-md border border-grey-200 bg-white px-[1.2rem] text-[1.3rem] font-medium text-grey-700 transition-all duration-200 hover:border-blue-600/30 hover:bg-blue-600/10 hover:text-blue-700 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-300 dark:hover:border-grey-600 dark:hover:bg-grey-800 dark:hover:text-grey-200';
const listToolbarButtonClass = 'inline-flex h-[3.2rem] items-center justify-center gap-[0.8rem] rounded-md bg-blue-600 px-[1.2rem] text-body-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:text-white focus:ring-[.08rem] focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-grey-900 dark:hover:bg-grey-100';
const listToolbarButtonIconClass = 'hidden h-[1.4rem] w-[1.4rem] sm:inline-block';
const rowActionIconClass = 'h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]';
const rowActionTextClass = 'lg:hidden';

/**
 * Subscribers List Page Template
 * Display all subscribers with filters and pagination
 * Structure matches Posts exactly
 */
export function subscribersListPage({ subscribers, pagination, filters, user, toast, error }) {
  const { total, page, totalPages } = pagination;

  // Build toast script
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          created: 'Subscriber added successfully!',
          updated: 'Subscriber updated successfully!',
          deleted: 'Subscriber deleted successfully!'
        };
        const message = toastMessages['${toast}'] || '${toast}';
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  ` : '';

  // Initialize delete modal with custom config for subscribers
  const deleteModal = new DeleteModal({
    entityName: 'Subscriber',
    entityLabel: 'name',
    deleteUrlPath: '/admin/subscribers',
    targetSelector: 'closest tr',
    swapMode: 'outerHTML swap:300ms',
    csrfToken: user?.csrfToken || '',
    title: 'Delete Subscriber?',
    message: '<span id="deleteEntityName"></span> will be deleted as a subscriber'
  });

  const content = `
    <div class="subscribers">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Subscribers</h1>
            <p class="page-header__subtitle">Manage newsletter subscribers (${total} total)</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        <div class="${listToolbarClass}">
          <div class="${listToolbarSearchClass}">
            <i data-lucide="search" class="${listToolbarSearchIconClass}"></i>
            <input
              type="text"
              class="${listToolbarInputClass}"
              placeholder="Search subscribers..."
              value="${filters.search || ''}"
              hx-get="/admin/subscribers"
              hx-target="#subscribers-table-container"
              hx-trigger="keyup changed delay:500ms"
              name="search"
            />
          </div>

          <div class="${listToolbarControlsClass}">
            <!-- Status Filter Dropdown -->
            <div class="hs-dropdown ${listToolbarDropdownClass}">
              <button
                id="hs-dropdown-status"
                type="button"
                class="hs-dropdown-toggle ${listToolbarDropdownTriggerClass} ${filters.status ? 'border-blue-600/30 bg-blue-600/10 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400' : ''}"
              >
                <span>${filters.status || 'Status'}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="hs-dropdown-menu dropdown__menu dropdown__menu--sm" aria-labelledby="hs-dropdown-status">
                <a href="/admin/subscribers${filters.search ? '?search=' + encodeURIComponent(filters.search) : ''}" class="dropdown__item ${!filters.status ? 'dropdown__item--active' : ''}">All Statuses</a>
                <a href="/admin/subscribers?status=ACTIVE${filters.search ? '&search=' + encodeURIComponent(filters.search) : ''}" class="dropdown__item ${filters.status === 'ACTIVE' ? 'dropdown__item--active' : ''}">Active</a>
                <a href="/admin/subscribers?status=PENDING${filters.search ? '&search=' + encodeURIComponent(filters.search) : ''}" class="dropdown__item ${filters.status === 'PENDING' ? 'dropdown__item--active' : ''}">Pending</a>
                <a href="/admin/subscribers?status=UNSUBSCRIBED${filters.search ? '&search=' + encodeURIComponent(filters.search) : ''}" class="dropdown__item ${filters.status === 'UNSUBSCRIBED' ? 'dropdown__item--active' : ''}">Unsubscribed</a>
                <a href="/admin/subscribers?status=BOUNCED${filters.search ? '&search=' + encodeURIComponent(filters.search) : ''}" class="dropdown__item ${filters.status === 'BOUNCED' ? 'dropdown__item--active' : ''}">Bounced</a>
              </div>
            </div>

            <!-- Add Subscriber Button -->
            <a
              href="/admin/subscribers/new"
              class="${listToolbarButtonClass}"
            >
              <i data-lucide="plus" class="${listToolbarButtonIconClass}"></i>
              <span>Add Subscriber</span>
            </a>
          </div>
        </div>

        <!-- Error Message -->
        ${error ? `<div class="alert alert--error mb-[1.6rem]">${error}</div>` : ''}

        <!-- Subscribers Table -->
        <div id="subscribers-table-container" class="subscribers__table-content">
          ${subscribers.length === 0
            ? emptyState()
            : renderSubscribersTable(subscribers, pagination, filters)
          }
        </div>

        ${subscribers.length > 0 && totalPages > 1 ? paginationHtml({ page, totalPages, filters }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Subscribers',
    description: 'Manage newsletter subscribers',
    content: content + deleteModal.render() + toastScript,
    user,
    activeRoute: '/admin/subscribers',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Subscribers', url: '/admin/subscribers' }
    ]
  });
}

/**
 * Render subscribers table - matches Posts structure exactly
 */
function renderSubscribersTable(subscribers, pagination, filters) {
  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
          <th>Confirmed</th>
          <th>Subscribed</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${subscribers.map(subscriber => renderSubscriberRow(subscriber)).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Render a single subscriber row - matches Posts row structure exactly
 */
export function renderSubscriberRow(subscriber) {
  const statusBadgeClass = {
    'ACTIVE': 'badge--success',
    'PENDING': 'badge--warning',
    'UNSUBSCRIBED': 'badge--neutral',
    'BOUNCED': 'badge--error'
  }[subscriber.status] || 'badge--neutral';

  return `
    <tr class="table__tr" id="subscriber-${subscriber.id}">
      <td class="table__td">
        <span class="table__label">Name</span>
        <div class="table__title">${escapeHtml(subscriber.name || '-')}</div>
      </td>
      <td class="table__td">
        <span class="table__label">Email</span>
        <div class="table__title">
          <a href="mailto:${escapeHtml(subscriber.email)}">${escapeHtml(subscriber.email)}</a>
        </div>
      </td>
      <td class="table__td">
        <span class="table__label">Status</span>
        <span class="badge ${statusBadgeClass}">${subscriber.status}</span>
      </td>
      <td class="table__td">
        <span class="table__label">Confirmed</span>
        ${subscriber.confirmedAt ? formatRelativeTime(subscriber.confirmedAt) : '-'}
      </td>
      <td class="table__td">
        <span class="table__label">Subscribed</span>
        ${formatRelativeTime(subscriber.createdAt)}
      </td>
      <td class="table__td table__td--actions">
        <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
          <a
            href="/admin/subscribers/${subscriber.id}/edit"
            class="btn btn--ghost row-action row-action--edit"
          >
            <i data-lucide="pencil" class="${rowActionIconClass}"></i>
            <span class="${rowActionTextClass}">Edit</span>
          </a>
          <button
            type="button"
            class="btn btn--ghost row-action row-action--delete"
            data-subscriber-id="${subscriber.id}"
            data-subscriber-name="${escapeHtml(subscriber.name || '')}"
            data-subscriber-email="${escapeHtml(subscriber.email)}"
            onclick="openDeleteModal(this)"
          >
            <i data-lucide="trash-2" class="${rowActionIconClass}"></i>
            <span class="${rowActionTextClass}">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Pagination HTML - matches Posts structure
 */
function paginationHtml({ page, totalPages, filters }) {
  // Build query prefix for filters
  const queryPrefix = new URLSearchParams();
  if (filters.status) queryPrefix.set('status', filters.status);
  if (filters.search) queryPrefix.set('search', filters.search);
  const queryString = queryPrefix.toString();
  const queryPrefixWithAmpersand = queryString ? '&' + queryString : '';

  // Previous button - always shows, disabled on page 1
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/subscribers?page=${page - 1}${queryPrefixWithAmpersand}` : '#';

  // Next button - always shows, disabled on last page
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/subscribers?page=${page + 1}${queryPrefixWithAmpersand}` : '#';

  // Page numbers logic (matching Posts pattern)
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

  let pageLinks = '';
  pageNumbers.forEach((p) => {
    if (p === '...') {
      pageLinks += '<span class="pagination__ellipsis">...</span>';
    } else {
      const activeClass = p === page ? 'pagination__item--active' : '';
      pageLinks += `<a href="/admin/subscribers?page=${p}${queryPrefixWithAmpersand}" class="pagination__item ${activeClass}">${p}</a>`;
    }
  });

  return `
    <footer class="page-footer">
      <div class="pagination">
        <a href="${prevHref}" class="pagination__item ${prevDisabled}">
          <i data-lucide="chevron-left"></i>
        </a>
        ${pageLinks}
        <a href="${nextHref}" class="pagination__item ${nextDisabled}">
          <i data-lucide="chevron-right"></i>
        </a>
      </div>
    </footer>
  `;
}

/**
 * Empty state when no subscribers - matches Posts structure
 */
function emptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">
        <i data-lucide="mail"></i>
      </div>
      <h3 class="empty-state__title">No Subscribers Yet</h3>
      <p class="empty-state__text">You don't have any subscribers yet. Click "Add Subscriber" to add one manually.</p>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
