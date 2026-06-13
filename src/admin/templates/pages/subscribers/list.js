// src/admin/templates/pages/subscribers/list.js
// Subscribers List Page - Refactored with list-toolbar partial

import { DeleteModal } from '../../components/delete-modal.js';
import { listToolbar } from '../../partials/list-toolbar.js';
import { escapeHtml, formatRelativeTime, SUBSCRIBER_STATUS_LABELS, paginationHtml, toastQueryScript } from '../../utils/helpers.js';



/**
 * Subscribers list page inner content (layout applied via fastify-html addLayout).
 */
export function subscribersListContent({ subscribers, pagination, filters, user, toast }) {
  const { page, totalPages } = pagination;

  const toastScript = toastQueryScript(toast, {
    created: 'Subscriber added successfully!',
    updated: 'Subscriber updated successfully!',
    deleted: 'Subscriber deleted successfully!',
  });

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
          searchUrl: '/admin/subscribers',
          searchTarget: '#subscribers-table-container',
          searchPlaceholder: 'Search subscribers...',
          searchValue: filters.search || '',
          filters: [],
          hasAddButton: true,
          addButtonUrl: '/admin/subscribers/new',
          addButtonLabel: 'Add Subscriber',
        })}

        <div id="subscribers-table-container" class="subscribers__table-content">
          ${subscribers.length === 0
            ? emptyState()
            : renderSubscribersTable(subscribers, pagination, filters)
          }
        </div>

        ${subscribers.length > 0 && totalPages > 1 ? paginationHtml({ basePath: '/admin/subscribers', page, totalPages, filters, filterKeys: ['status', 'search'] }) : ''}
      </div>
    </div>

    ${toastScript}
  `;

  return content;
}

/** Delete modal HTML for subscribers list page */
export function subscribersListModals({ user }) {
  const deleteModal = new DeleteModal({
    entityName: 'Subscriber',
    entityLabel: 'email',
    deleteUrlPath: '/admin/subscribers',
    targetSelector: 'closest tr',
    swapMode: 'outerHTML swap:300ms',
    csrfToken: user?.csrfToken || '',
    title: 'Delete Subscriber?',
    message: '<span id="deleteEntityName"></span> will be deleted as a subscriber'
  });

  return deleteModal.render();
}

/** Page metadata for subscribers list */
export function subscribersListMeta({ user }) {
  return {
    title: 'Subscribers',
    description: 'Manage newsletter subscribers',
    activeRoute: '/admin/subscribers',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Subscribers', url: '/admin/subscribers' },
    ],
    modals: subscribersListModals({ user }),
  };
}

/**
 * Generate subscribers table HTML fragment for HTMX updates
 * Matches what's inside #subscribers-table-container in list.js
 */
export function subscribersTableFragment({ subscribers, pagination, filters }) {
  if (!subscribers || subscribers.length === 0) {
    return `
      <div class="empty">
        <h3>No Subscribers Yet</h3>
        <p>You don't have any subscribers yet. Click "Add Subscriber" to add one manually.</p>
      </div>
    `;
  }

  const rows = subscribers.map(subscriber => renderSubscriberRow(subscriber)).join('');

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Confirmed</th>
          <th>Subscribed</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Render subscribers table - matches Posts structure exactly
 */
function renderSubscribersTable(subscribers, pagination, filters) {
  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
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


