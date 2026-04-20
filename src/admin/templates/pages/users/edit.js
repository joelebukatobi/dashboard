// src/admin/templates/pages/users/edit.js
// Edit User Page - Two column layout with avatar upload

import { mainLayout } from '../../layouts/main.js';
import { escapeHtml, formatDate, formatRelativeTime, getInitials } from '../../utils/helpers.js';

/**
 * Edit User Page Template
 * Two column layout: Left (form + avatar), Right (profile card with stats)
 */
export function usersEditPage({ editUser, user, userStats = {}, errors = {} }) {
  // Check if editing self
  const isSelf = user?.id === editUser?.id;
  // Check if this is the last admin
  const canChangeRole = !(isSelf && editUser?.role === 'ADMIN');
  
  // Get initials for avatar placeholder
  const initials = getInitials(editUser.firstName, editUser.lastName);

  const content = `
    <div class="users">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Edit User</h1>
            <p class="page-header__subtitle">Update user details and permissions</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="form__row">
          <!-- Left Column: Avatar Upload + Edit Form -->
          <div class="form__col">
            <div class="card">
              <div class="card__header">
                <h2>User Details</h2>
              </div>
              <div class="card__body">
                <form
                  class="form"
                  id="editUserForm"
                  hx-put="/admin/users/${editUser.id}"
                  hx-target="#form-response"
                  hx-swap="innerHTML"
                >
                  <div id="form-response"></div>

                  <!-- Avatar Upload Section -->
                  <div class="form__group">
                    <div class="form__avatar-group form__avatar-group--centered">
                      <div id="avatarPreview" class="form__avatar-preview">
                        ${editUser.avatarUrl 
                          ? `<img src="${editUser.avatarUrl}" alt="${escapeHtml(editUser.firstName)}" />`
                          : `<div class="form__avatar-placeholder"><span>${initials}</span></div>`
                        }
                      </div>
                      <div class="form__avatar-actions">
                        <input 
                          type="file" 
                          id="avatarInput" 
                          name="avatar" 
                          accept="image/jpeg,image/png,image/jpg" 
                          class="hidden" 
                          hx-post="/admin/users/${editUser.id}/avatar"
                          hx-target="#avatarPreview"
                          hx-swap="innerHTML"
                          hx-encoding="multipart/form-data"
                          hx-trigger="change"
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
                        value="${escapeHtml(editUser.firstName)}"
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
                        value="${escapeHtml(editUser.lastName)}"
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
                        value="${escapeHtml(editUser.email)}"
                        required
                      />
                      ${errors.email ? `<p class="form-feedback form-feedback--error">${errors.email}</p>` : ''}
                    </div>

                    <div class="form__group ${errors.role ? 'form__group--error' : ''}">
                      <label class="label label--required">Role</label>
                      <input 
                        type="text" 
                        class="input" 
                        value="${editUser.role === 'ADMIN' ? 'Admin - Full System Access' : editUser.role === 'EDITOR' ? 'Editor - Can Publish and Manage All Content' : editUser.role === 'AUTHOR' ? 'Author - Can Create and Edit Own Posts' : 'Viewer - Read-Only Access'}" 
                      disabled 
                    />
                      ${!canChangeRole
                        ? `<p class="form-feedback form-feedback--hint">You cannot change your own admin role. Another admin must do this.</p>`
                        : `<p class="form-feedback form-feedback--hint form__role-hints">
                           <strong>Admin:</strong> Full access | <strong>Editor:</strong> Manage all content | 
                           <strong>Author:</strong> Own content only | <strong>Viewer:</strong> Read only
                         </p>`
                      }
                    ${errors.role ? `<p class="form-feedback form-feedback--error">${errors.role}</p>` : ''}
                  </div>
                  </div>

                  <!-- Divider -->
                  <hr class="form__divider" />

                  <!-- Account Information -->
                  <div class="form__group">
                    <h4 class="form__info-box-title form__info-box-title--mb">Account Information</h4>
                    <div class="form__details-list">
                      <div class="form__details-item">
                        <span class="form__details-item-label">Joined</span>
                        <span class="form__details-item-value">${formatDate(editUser.createdAt)}</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Last Active</span>
                        <span class="form__details-item-value">${editUser.lastActiveAt ? formatRelativeTime(editUser.lastActiveAt) : 'Never'}</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Status</span>
                        <span class="form__details-item-value form__details-item-value--${getStatusClass(editUser.status)}">${editUser.status}</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Posts Created</span>
                        <span class="form__details-item-value">${userStats.postsCount || 0} Posts</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Tags Created</span>
                        <span class="form__details-item-value">${userStats.tagsCount || 0} Tags</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Categories Created</span>
                        <span class="form__details-item-value">${userStats.categoriesCount || 0} Categories</span>
                      </div>
                      <hr class="form__divider form__divider--sm" />
                      <div class="form__details-item">
                        <span class="form__details-item-label">Users Created</span>
                        <span class="form__details-item-value">${userStats.usersCount || 0} Users</span>
                      </div>
                    </div>
                  </div>

                  <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
                </form>
              </div>
              <div class="card__footer">
                <div class="form__field-group">
                  <button type="button" class="btn btn--primary" onclick="submitForm()">
                    Save Changes
                  </button>
                  <a href="/admin/users" class="btn btn--ghost btn--cancel">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal" role="dialog" tabindex="-1" aria-labelledby="deleteModalLabel">
      <div class="modal__backdrop" onclick="closeDeleteModal()"></div>
      <div class="modal__panel">
        <div class="modal__header">
          <div class="modal__icon modal__icon--danger">
            <i data-lucide="alert-triangle"></i>
          </div>
          <h3 id="deleteModalLabel" class="modal__title">Delete User?</h3>
          <p class="modal__description">This action cannot be undone. <span id="deleteUserName"></span> will lose all access to the system.</p>
        </div>
        <form
          id="deleteUserForm"
          hx-delete=""
          hx-target="#form-response"
          hx-swap="innerHTML"
          class="modal__footer"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
          <button type="submit" class="btn btn--danger btn--full">Delete User</button>
          <button type="button" class="btn btn--outline btn--full" onclick="closeDeleteModal()">Cancel</button>
        </form>
      </div>
    </div>

    <script>
      function submitForm() {
        htmx.trigger('#editUserForm', 'submit');
      }

      function confirmDelete(userId, userName) {
        document.getElementById('deleteUserName').textContent = userName;
        const form = document.getElementById('deleteUserForm');
        form.setAttribute('hx-delete', '/admin/users/' + userId);
        if (typeof htmx !== 'undefined') {
          htmx.process(form);
        }
        document.getElementById('deleteModal').classList.add('is-open');
      }

      function closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('is-open');
      }
    </script>
  `;

  return mainLayout({
    title: 'Edit User',
    description: 'Manage user details and permissions',
    content,
    user,
    activeRoute: '/admin/users',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Users', url: '/admin/users' },
      { label: `${editUser.firstName} ${editUser.lastName}`, url: `/admin/users/${editUser.id}/edit` }
    ]
  });
}

/**
 * Get status class
 */
function getStatusClass(status) {
  const classes = {
    'ACTIVE': 'success',
    'INVITED': 'warning',
    'SUSPENDED': 'danger'
  };
  return classes[status] || 'default';
}
