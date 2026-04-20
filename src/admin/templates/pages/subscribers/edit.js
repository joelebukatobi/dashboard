// src/admin/templates/pages/subscribers/edit.js
// Edit Subscriber Page - Form to edit a subscriber

import { mainLayout } from '../../layouts/main.js';
import { escapeHtml } from '../../utils/helpers.js';

/**
 * Edit Subscriber Page Template
 * @param {Object} params - Template parameters
 * @param {Object} params.user - Current user
 * @param {Object} params.subscriber - Subscriber to edit
 * @param {string} params.error - Optional error message
 */
export function editSubscriberPage({ user, subscriber, error }) {
  const content = `
    <div class="subscribers">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit Subscriber</h1>
            <p class="page-header__subtitle">Update subscriber details</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        ${error ? `<div class="alert alert--error alert--mb">${error}</div>` : ''}

        <!-- Form -->
        <div class="card">
          <div class="card__body">
            <form
              class="form"
              id="editSubscriberForm"
              hx-put="/admin/subscribers/${subscriber.id}"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div id="form-response"></div>
              <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />

              <div class="form__group">
                <label class="label label--required" for="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  class="input"
                  placeholder="John Doe"
                  value="${escapeHtml(subscriber.name || '')}"
                  required
                />
              </div>

              <div class="form__group">
                <label class="label label--required" for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="input"
                  placeholder="john@example.com"
                  value="${escapeHtml(subscriber.email)}"
                  required
                />
              </div>

              <div class="form__group">
                <label class="label" for="status">Status</label>
                <select
                  id="status"
                  name="status"
                  class="hidden"
                  data-hs-select='{
                    "placeholder": "Select status...",
                    "toggleClasses": "form__select-toggle",
                    "dropdownClasses": "form__select-dropdown",
                    "optionClasses": "form__select-option"
                  }'
                >
                  <option value="ACTIVE" ${subscriber.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                  <option value="PENDING" ${subscriber.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                  <option value="UNSUBSCRIBED" ${subscriber.status === 'UNSUBSCRIBED' ? 'selected' : ''}>Unsubscribed</option>
                  <option value="BOUNCED" ${subscriber.status === 'BOUNCED' ? 'selected' : ''}>Bounced</option>
                </select>
              </div>
            </form>
          </div>
          <div class="card__footer">
            <div class="form__field-group">
              <button type="submit" form="editSubscriberForm" class="btn btn--primary">
                Save Changes
              </button>
              <a href="/admin/subscribers" class="btn btn--ghost btn--cancel">Cancel</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return mainLayout({
    title: 'Edit Subscriber',
    description: 'Update subscriber details',
    content,
    user,
    activeRoute: '/admin/subscribers',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Subscribers', url: '/admin/subscribers' },
      { label: 'Edit Subscriber', url: `/admin/subscribers/${subscriber.id}/edit` }
    ]
  });
}
