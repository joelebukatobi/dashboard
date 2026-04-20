// src/admin/templates/pages/subscribers/list.js
// Subscribers List Page - Refactored with list-toolbar partial

import { mainLayout } from '../../layouts/main.js';
import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatRelativeTime, SUBSCRIBER_STATUS_LABELS } from '../../utils/helpers.js';



/**
 * Subscribers List Page Template
 * Display all subscribers with filters and pagination
 */
export function subscribersListPage({ subscribers, pagination, filters, user, toast }) {
  const { page, totalPages } = pagination;

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

  // Build filters array for toolbar
  const toolbarFilters = [
    {
      label: filters.status ? SUBSCRIBER_STATUS_LABELS[filters.status] : 'Status',
      options: [
        { url: '/admin/subscribers', label: 'All Statuses', active: !filters.status },
        { url: '/admin/subscribers?status=ACTIVE', label: 'Active', active: filters.status === 'ACTIVE' },
        { url: '/admin/subscribers?status=PENDING', label: 'Pending', active: filters.status === 'PENDING' },
        { url: '/admin/subscribers?status=UNSUBSCRIBED', label: 'Unsubscribed', active: filters.status === 'UNSUBSCRIBED' },
        { url: '/admin/subscribers?status=BOUNCED', label: 'Bounced', active: filters.status === 'BOUNCED' },
      ],
    },
  ];

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
            <p class="page-header__subtitle">Manage newsletter subscribers (${pagination.total} total)</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <!-- Data Filter -->
        ${listToolbar({
          searchPlaceholder: 'Search subscribers...',
          searchValue: filters.search || '',
          filters: toolbarFilters,
          hasAddButton: true,
          addButtonUrl: '/admin/subscribers/new',
          addButtonText: 'Add Subscriber',
        })}

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
        <div class="row-actions">
          <a
            href="/admin/subscribers/${subscriber.id}/edit"
            class="btn btn--ghost row-action row-action--edit"
          >
            <i data-lucide="pencil"></i>
            <span>Edit</span>
          </a>
          <button
            type="button"
            class="btn btn--ghost row-action row-action--delete"
            data-subscriber-id="${subscriber.id}"
            data-subscriber-name="${escapeHtml(subscriber.name || '')}"
            data-subscriber-email="${escapeHtml(subscriber.email)}"
            onclick="openDeleteModal(this)"
          >
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
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
    <div class="empty">
      <h3>No Subscribers Yet</h3>
      <p>You don't have any subscribers yet. Click "Add Subscriber" to add one manually.</p>
    </div>
  `;
}


