// src/admin/templates/pages/users/new.js
// New User Page - Mirrors edit layout with placeholder avatar

import { renderFormSelect } from '../../partials/form-select.js';

const ROLE_OPTIONS = [
  { value: 'AUTHOR', label: 'Author - Can Create and Edit Own Posts' },
  { value: 'VIEWER', label: 'Viewer - Read-Only Access' },
  { value: 'EDITOR', label: 'Editor - Can Publish and Manage All Content' },
  { value: 'ADMIN', label: 'Admin - Full System Access' },
];

/**
 * New User page inner content (layout applied via fastify-html addLayout).
 */
export function usersNewContent({ user, errors = {} }) {
  const content = `
    <div class="users">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Add User</h1>
            <p class="page-header__subtitle">Invite a new team member to collaborate</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="form__row">
          <!-- Left Column: Avatar + Form -->
          <div class="form__col">
            <div class="card">
              <div class="card__header">
                <h2>User Details</h2>
              </div>
              <div class="card__body">
                <form
                  class="form"
                  id="newUserForm"
                  novalidate
                  hx-post="/admin/users"
                  hx-target="#form-response"
                  hx-swap="innerHTML"
                  hx-on:config-request="window.syncFormSelectValues(event.detail.elt)"
                >
                  <div id="form-response"></div>

                  <!-- Avatar Placeholder Section -->
                  <div class="form__group">
                    <div class="form__avatar-group form__avatar-group--centered">
                      <div id="avatarPreview" class="form__avatar-placeholder">
                        <i data-lucide="user" stroke-width="1"></i>
                      </div>
                      <div class="form__avatar-actions">
                        <input
                          type="file"
                          id="avatarInput"
                          name="avatar"
                          accept="image/jpeg,image/png,image/jpg"
                          class="hidden"
                        />
                        <button
                          type="button"
                          class="btn btn--outline"
                          onclick="document.getElementById('avatarInput').click()"
                        >
                          Change Photo
                        </button>
                        <p class="form__hint">JPG, PNG. Max 10MB.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Divider -->
                  <hr class="form__divider" />

                  <!-- First Name & Last Name Row -->
                  <div class="form__row form__row--2col">
                    <div class="form__group ${errors.firstName ? 'form__group--error' : ''}">
                      <label class="label label--required" for="userFirstName">First Name</label>
                      <input
                        type="text"
                        class="input"
                        id="userFirstName"
                        name="firstName"
                        placeholder="John"
                        required
                      />
                      ${errors.firstName ? `<p class="form-feedback form-feedback--error">${errors.firstName}</p>` : ''}
                    </div>
                    <div class="form__group ${errors.lastName ? 'form__group--error' : ''}">
                      <label class="label label--required" for="userLastName">Last Name</label>
                      <input
                        type="text"
                        class="input"
                        id="userLastName"
                        name="lastName"
                        placeholder="Doe"
                        required
                      />
                      ${errors.lastName ? `<p class="form-feedback form-feedback--error">${errors.lastName}</p>` : ''}
                    </div>
                  </div>

                  <!-- Email & Role Row -->
                  <div class="form__row form__row--2col">
                    <div class="form__group ${errors.email ? 'form__group--error' : ''}">
                      <label class="label label--required" for="userEmail">Email Address</label>
                      <input
                        type="email"
                        class="input"
                        id="userEmail"
                        name="email"
                        placeholder="user@example.com"
                        required
                      />
                      ${errors.email ? `<p class="form-feedback form-feedback--error">${errors.email}</p>` : ''}
                    </div>

                    <div class="form__group ${errors.role ? 'form__group--error' : ''}">
                      <label class="label label--required" for="userRole">Role</label>
                      ${renderFormSelect(
                        'role',
                        ROLE_OPTIONS,
                        'AUTHOR',
                        'AUTHOR',
                        'Select a role...',
                        'userRole',
                      )}
                      <p class="form-feedback form-feedback--hint form__role-hints">
                        <strong>Admin:</strong> Full Access |
                        <strong>Editor:</strong> Manage All Content |
                        <strong>Author:</strong> Own Content Only |
                        <strong>Viewer:</strong> Read Only
                      </p>
                      ${errors.role ? `<p class="form-feedback form-feedback--error">${errors.role}</p>` : ''}
                    </div>
                  </div>

                  <!-- Invite Options -->
                  <div class="form__group">
                    <label class="form__checkbox-wrapper" for="sendInvite">
                      <input
                        type="checkbox"
                        class="form__checkbox"
                        id="sendInvite"
                        name="sendInvite"
                        value="true"
                        checked
                      />
                      <span>
                        Send invitation email (user will set their own password)
                      </span>
                    </label>
                  </div>

                  <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
                </form>
              </div>
              <div class="card__footer">
                <div class="form__field-group">
                  <button type="submit" form="newUserForm" class="btn btn--primary">
                    Add User
                  </button>
                  <a href="/admin/users" class="btn btn--outline btn--cancel">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  `;

  return content;
}

export function userNewMeta() {
  return {
    title: 'Add User',
    description: 'Invite a new team member',
    activeRoute: '/admin/users',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Users', url: '/admin/users' },
      { label: 'Add User', url: '/admin/users/new' },
    ],
  };
}
