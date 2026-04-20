// src/admin/templates/pages/users/new.js
// New User Page - Mirrors edit layout with placeholder avatar

import { mainLayout } from '../../layouts/main.js';

/**
 * New User Page Template
 * Create new user or send invitation
 */
export function usersNewPage({ user, errors = {} }) {
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
                  hx-post="/admin/users"
                  hx-target="#form-response"
                  hx-swap="innerHTML"
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
                      <label class="label label--required">First Name</label>
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
                      <label class="label label--required">Last Name</label>
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
                      <label class="label label--required">Email Address</label>
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
                      <label class="label label--required">Role</label>
                      <select
                        name="role"
                        id="userRole"
                        data-hs-select='{
                          "placeholder": "Select a role...",
                          "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option"
                      }'
                      class="hidden"
                      required
                    >
                      <option value="">Select a role...</option>
                      <option value="ADMIN">Admin - Full System Access</option>
                      <option value="EDITOR">Editor - Can Publish and Manage All Content</option>
                      <option value="AUTHOR">Author - Can Create and Edit Own Posts</option>
                      <option value="VIEWER">Viewer - Read-Only Access</option>
                    </select>
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
                    <label class="form__checkbox-wrapper">
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
                  <button type="button" class="btn btn--primary" onclick="submitForm()">
                    Add User
                  </button>
                  <a href="/admin/users" class="btn btn--ghost btn--cancel">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Submit form using HTMX trigger
      function submitForm() {
        htmx.trigger('#newUserForm', 'submit');
      }
    </script>
  `;

  return mainLayout({
    title: 'Add User',
    description: 'Invite a new team member',
    content,
    user,
    activeRoute: '/admin/users',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Users', url: '/admin/users' },
      { label: 'Add User', url: '/admin/users/new' }
    ]
  });
}
