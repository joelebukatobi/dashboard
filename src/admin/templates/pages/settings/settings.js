// src/admin/templates/pages/settings/settings.js
// Settings Page - Individual section forms with accordion

import { mainLayout } from '../../layouts/main.js';

/**
 * Settings Page Template
 * Accordion-style sections with individual save buttons
 */
export function settingsPage({ user, settings, toast }) {
  // Build toast script
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: 'Settings saved successfully!', type: 'success' }
        }));
      });
    </script>
  ` : '';

  // Helper to get setting value
  const getSetting = (group, key, defaultValue = '') => {
    const groupSettings = settings?.[group] || [];
    const setting = groupSettings.find(s => s.key === key);
    return setting?.parsedValue ?? defaultValue;
  };

  const content = `
    <div class="settings">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">Settings</h1>
            <p class="page-header__subtitle">Configure your site preferences and options</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div id="form-response"></div>

        <div class="form__stack">
          <!-- ==================== GENERAL SETTINGS (Open by default) ==================== -->
          <div class="card card--accordion" data-accordion="general">
            <form
              hx-put="/admin/settings"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div class="card__header card__header--accordion" onclick="toggleAccordion('general')">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--blue">
                    <i data-lucide="globe" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">General Settings</h2>
                    <p class="card__subtitle">Basic site information and configuration</p>
                  </div>
                </div>
                <div class="card__header-actions">
                  <button type="submit" class="btn btn--primary btn--lg">
                    <i data-lucide="save" stroke-width="1"></i>
                    Save Changes
                  </button>
                  <span class="card__accordion-icon">
                    <i data-lucide="chevron-up" stroke-width="1"></i>
                  </span>
                </div>
              </div>
              <div class="card__body card__body--accordion" data-accordion-body="general">
                <!-- Site Name & Tagline -->
                <div class="form__row form__row--2col">
                  <div class="form__group">
                    <label class="label label--required">Site Name</label>
                    <input
                      type="text"
                      class="input"
                      name="siteName"
                      value="${escapeHtml(getSetting('GENERAL', 'siteName', 'My Blog'))}"
                      required
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">Tagline</label>
                    <input
                      type="text"
                      class="input"
                      name="siteTagline"
                      value="${escapeHtml(getSetting('GENERAL', 'siteTagline', 'Thoughts, stories and ideas'))}"
                    />
                  </div>
                </div>

                <!-- Site URL -->
                <div class="form__group">
                  <label class="label label--required">Site URL</label>
                  <input
                    type="url"
                    class="input"
                    name="siteUrl"
                    value="${escapeHtml(getSetting('GENERAL', 'siteUrl', 'https://example.com'))}"
                    required
                  />
                </div>

                <!-- Timezone, Date Format, Language -->
                <div class="form__row form__row--3col">
                  <div class="form__group">
                    <label class="label">Timezone</label>
                    <select
                      name="timezone"
                      class="hidden"
                      data-hs-select='{
                        "placeholder": "Select timezone...",
                        "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option"
                      }'
                    >
                      <option value="UTC" ${getSetting('GENERAL', 'timezone', 'UTC') === 'UTC' ? 'selected' : ''}>UTC</option>
                      <option value="America/New_York" ${getSetting('GENERAL', 'timezone') === 'America/New_York' ? 'selected' : ''}>Eastern Time (ET)</option>
                      <option value="America/Chicago" ${getSetting('GENERAL', 'timezone') === 'America/Chicago' ? 'selected' : ''}>Central Time (CT)</option>
                      <option value="America/Denver" ${getSetting('GENERAL', 'timezone') === 'America/Denver' ? 'selected' : ''}>Mountain Time (MT)</option>
                      <option value="America/Los_Angeles" ${getSetting('GENERAL', 'timezone') === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time (PT)</option>
                      <option value="Europe/London" ${getSetting('GENERAL', 'timezone') === 'Europe/London' ? 'selected' : ''}>London (GMT)</option>
                      <option value="Europe/Paris" ${getSetting('GENERAL', 'timezone') === 'Europe/Paris' ? 'selected' : ''}>Paris (CET)</option>
                      <option value="Asia/Tokyo" ${getSetting('GENERAL', 'timezone') === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo (JST)</option>
                    </select>
                  </div>
                  <div class="form__group">
                    <label class="label">Date Format</label>
                    <select
                      name="dateFormat"
                      class="hidden"
                      data-hs-select='{
                        "placeholder": "Select date format...",
                        "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option"
                      }'
                    >
                      <option value="MM/DD/YYYY" ${getSetting('GENERAL', 'dateFormat', 'MM/DD/YYYY') === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY" ${getSetting('GENERAL', 'dateFormat') === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD" ${getSetting('GENERAL', 'dateFormat') === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                      <option value="MMM DD, YYYY" ${getSetting('GENERAL', 'dateFormat') === 'MMM DD, YYYY' ? 'selected' : ''}>MMM DD, YYYY</option>
                    </select>
                  </div>
                  <div class="form__group">
                    <label class="label">Language</label>
                    <select
                      name="language"
                      class="hidden"
                      data-hs-select='{
                        "placeholder": "Select language...",
                        "toggleClasses": "form__select-toggle",
                        "dropdownClasses": "form__select-dropdown",
                        "optionClasses": "form__select-option"
                      }'
                    >
                      <option value="en-US" ${getSetting('GENERAL', 'language', 'en-US') === 'en-US' ? 'selected' : ''}>English (US)</option>
                      <option value="en-GB" ${getSetting('GENERAL', 'language') === 'en-GB' ? 'selected' : ''}>English (UK)</option>
                      <option value="es" ${getSetting('GENERAL', 'language') === 'es' ? 'selected' : ''}>Spanish</option>
                      <option value="fr" ${getSetting('GENERAL', 'language') === 'fr' ? 'selected' : ''}>French</option>
                      <option value="de" ${getSetting('GENERAL', 'language') === 'de' ? 'selected' : ''}>German</option>
                    </select>
                  </div>
                </div>

                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
              </div>
            </form>
          </div>

          <!-- ==================== CONTENT SETTINGS (Collapsed) ==================== -->
          <div class="card card--accordion card--collapsed" data-accordion="content">
            <form
              hx-put="/admin/settings"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div class="card__header card__header--accordion" onclick="toggleAccordion('content')">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--green">
                    <i data-lucide="file-text" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">Content Settings</h2>
                    <p class="card__subtitle">Control how content is published and displayed</p>
                  </div>
                </div>
                <div class="card__header-actions">
                  <button type="submit" class="btn btn--primary btn--lg">
                    <i data-lucide="save" stroke-width="1"></i>
                    Save Changes
                  </button>
                  <span class="card__accordion-icon">
                    <i data-lucide="chevron-down" stroke-width="1"></i>
                  </span>
                </div>
              </div>
              <div class="card__body card__body--accordion" data-accordion-body="content">
                <div class="form__row form__row--3col">
                  <div class="form__group">
                    <label class="label">Posts Per Page</label>
                    <input
                      type="number"
                      class="input"
                      name="postsPerPage"
                      value="${getSetting('CONTENT', 'postsPerPage', '10')}"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div class="form__group">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="enableComments"
                      value="true"
                      ${getSetting('CONTENT', 'enableComments', true) ? 'checked' : ''}
                      class="form__checkbox"
                    />
                    <span>Enable comments on posts</span>
                  </label>
                </div>

                <div class="form__group">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="moderateComments"
                      value="true"
                      ${getSetting('CONTENT', 'moderateComments', false) ? 'checked' : ''}
                      class="form__checkbox"
                    />
                    <span>Require moderation for new comments</span>
                  </label>
                </div>

                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
              </div>
            </form>
          </div>

          <!-- ==================== SECURITY SETTINGS (Collapsed) ==================== -->
          <div class="card card--accordion card--collapsed" data-accordion="security">
            <form
              hx-put="/admin/settings"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div class="card__header card__header--accordion" onclick="toggleAccordion('security')">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--red">
                    <i data-lucide="shield" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">Security</h2>
                    <p class="card__subtitle">Protect your account and manage access</p>
                  </div>
                </div>
                <div class="card__header-actions">
                  <button type="submit" class="btn btn--primary btn--lg">
                    <i data-lucide="save" stroke-width="1"></i>
                    Save Changes
                  </button>
                  <span class="card__accordion-icon">
                    <i data-lucide="chevron-down" stroke-width="1"></i>
                  </span>
                </div>
              </div>
              <div class="card__body card__body--accordion" data-accordion-body="security">
                <div class="form__row form__row--3col">
                  <div class="form__group">
                    <label class="label">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      class="input"
                      name="sessionTimeout"
                      value="${getSetting('SECURITY', 'sessionTimeout', '60')}"
                      min="5"
                      max="1440"
                    />
                    <p class="form-feedback form-feedback--hint">Time before inactive users are logged out</p>
                  </div>
                </div>

                <div class="form__group">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="requireStrongPasswords"
                      value="true"
                      ${getSetting('SECURITY', 'requireStrongPasswords', true) ? 'checked' : ''}
                      class="form__checkbox"
                    />
                    <span>Require strong passwords (8+ chars, numbers, symbols)</span>
                  </label>
                </div>

                <div class="form__group">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="twoFactorAuth"
                      value="true"
                      ${getSetting('SECURITY', 'twoFactorAuth', false) ? 'checked' : ''}
                      class="form__checkbox"
                    />
                    <span>Enable two-factor authentication (2FA)</span>
                  </label>
                  <p class="form-feedback form-feedback--hint">Users will need an authenticator app to log in</p>
                </div>

                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
              </div>
            </form>
          </div>

          <!-- ==================== EMAIL SETTINGS (Collapsed) ==================== -->
          <div class="card card--accordion card--collapsed" data-accordion="email">
            <form
              hx-put="/admin/settings"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div class="card__header card__header--accordion" onclick="toggleAccordion('email')">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--purple">
                    <i data-lucide="mail" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">Email Settings</h2>
                    <p class="card__subtitle">Configure email notifications and SMTP</p>
                  </div>
                </div>
                <div class="card__header-actions">
                  <button type="submit" class="btn btn--primary btn--lg">
                    <i data-lucide="save" stroke-width="1"></i>
                    Save Changes
                  </button>
                  <span class="card__accordion-icon">
                    <i data-lucide="chevron-down" stroke-width="1"></i>
                  </span>
                </div>
              </div>
              <div class="card__body card__body--accordion" data-accordion-body="email">
                <div class="form__info-box">
                  <p class="form__info-box-text">Email configuration coming soon. Contact your administrator to configure SMTP settings.</p>
                </div>

                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
              </div>
            </form>
          </div>

          <!-- ==================== SOCIAL SETTINGS (Collapsed) ==================== -->
          <div class="card card--accordion card--collapsed" data-accordion="social">
            <form
              hx-put="/admin/settings"
              hx-target="#form-response"
              hx-swap="innerHTML"
            >
              <div class="card__header card__header--accordion" onclick="toggleAccordion('social')">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--cyan">
                    <i data-lucide="share-2" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">Social Media</h2>
                    <p class="card__subtitle">Link your social media accounts</p>
                  </div>
                </div>
                <div class="card__header-actions">
                  <button type="submit" class="btn btn--primary btn--lg">
                    <i data-lucide="save" stroke-width="1"></i>
                    Save Changes
                  </button>
                  <span class="card__accordion-icon">
                    <i data-lucide="chevron-down" stroke-width="1"></i>
                  </span>
                </div>
              </div>
              <div class="card__body card__body--accordion" data-accordion-body="social">
                <div class="form__row form__row--2col">
                  <div class="form__group">
                    <label class="label">Twitter/X URL</label>
                    <input
                      type="url"
                      class="input"
                      name="socialTwitter"
                      value="${escapeHtml(getSetting('SOCIAL', 'socialTwitter', ''))}"
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">Facebook URL</label>
                    <input
                      type="url"
                      class="input"
                      name="socialFacebook"
                      value="${escapeHtml(getSetting('SOCIAL', 'socialFacebook', ''))}"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                </div>

                <div class="form__row form__row--2col">
                  <div class="form__group">
                    <label class="label">LinkedIn URL</label>
                    <input
                      type="url"
                      class="input"
                      name="socialLinkedIn"
                      value="${escapeHtml(getSetting('SOCIAL', 'socialLinkedIn', ''))}"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">GitHub URL</label>
                    <input
                      type="url"
                      class="input"
                      name="socialGitHub"
                      value="${escapeHtml(getSetting('SOCIAL', 'socialGitHub', ''))}"
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>

                <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Accordion toggle function
      function toggleAccordion(section) {
        const card = document.querySelector('[data-accordion="' + section + '"]');
        if (!card) return;

        // Close all other sections
        document.querySelectorAll('.card--accordion').forEach(function(otherCard) {
          if (otherCard !== card && !otherCard.classList.contains('card--collapsed')) {
            otherCard.classList.add('card--collapsed');
          }
        });

        // Toggle current section
        card.classList.toggle('card--collapsed');
      }
    </script>

    ${toastScript}
  `;

  return mainLayout({
    title: 'Settings',
    description: 'Configure your site preferences',
    content,
    user,
    activeRoute: '/admin/settings',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Settings', url: '/admin/settings' },
    ],
  });
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
