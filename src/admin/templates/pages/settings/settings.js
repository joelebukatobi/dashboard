// src/admin/templates/pages/settings/settings.js
// Settings Page - Individual section forms with accordion

import { escapeHtml, toastQueryScript } from '../../utils/helpers.js';
import { totpSetupModal } from '../../partials/totp-setup.js';

/**
 * Settings page inner content (layout applied via fastify-html addLayout).
 */
export function settingsContent({ user, settings, toast }) {
  const toastScript = toastQueryScript(toast, {
    saved: 'Settings saved successfully!',
    iconUploaded: 'Site icon updated.',
    iconSelected: 'Site icon updated from library.',
    iconRemoved: 'Site icon removed.',
    totpEnrolled: 'Two-factor authentication enabled on your account.',
  });

  // Helper to get setting value
  const getSetting = (group, key, defaultValue = '') => {
    const groupSettings = settings?.[group] || [];
    const setting = groupSettings.find(s => s.key === key);
    return setting?.parsedValue ?? defaultValue;
  };

  const siteIcon = getSetting('GENERAL', 'siteIcon', '');
  const siteTwoFactorOn = getSetting('SECURITY', 'twoFactorAuth', false);
  const userEnrolled = user?.totpEnabled === true;
  const userPending = user?.totpPending === true;
  const safeUserId = escapeHtml(user?.id || '');
  const siteIconPreview = siteIcon
    ? `<img src="${escapeHtml(siteIcon)}" alt="Site icon" class="site-icon-field__preview-img" />`
    : `<i data-lucide="square-library" class="site-icon-field__preview-icon"></i>`;

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
        <input type="hidden" id="settings-csrf" name="_csrf" value="${user?.csrfToken || ''}" />
        <form
          id="siteIconUploadForm"
          class="site-icon-field__upload-form"
          hx-post="/admin/settings/icon"
          hx-encoding="multipart/form-data"
          hx-target="#form-response"
          hx-swap="innerHTML"
        >
          <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
        </form>

        <div class="form__stack">
          <!-- ==================== GENERAL SETTINGS (Open by default) ==================== -->
          <div class="card card--accordion" data-accordion="general">
            <form
              id="generalSettingsForm"
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
                     <h2>General Settings</h2>
                     <p>Basic site information and configuration</p>
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
                <!-- Site Icon -->
                <div class="site-icon-field">
                  <div class="site-icon-field__row">
                    <label class="site-icon-field__trigger" for="siteIconFileInput" title="Change site icon">
                      <div class="site-icon-field__preview" id="siteIconPreview">
                        ${siteIconPreview}
                        <span class="site-icon-field__overlay">
                          <i data-lucide="upload"></i>
                          <span>${siteIcon ? 'Change' : 'Upload'}</span>
                        </span>
                      </div>
                    </label>
                    <div class="site-icon-field__info">
                      <span class="site-icon-field__title">Site Icon</span>
                      <p class="form-feedback form-feedback--hint">Used in the sidebar and as the default favicon. Falls back to the library icon when empty.</p>
                      ${siteIcon ? `
                        <button
                          type="button"
                          class="btn btn--ghost btn--sm site-icon-field__remove"
                          hx-delete="/admin/settings/icon"
                          hx-target="#form-response"
                          hx-swap="innerHTML"
                          hx-include="#settings-csrf"
                        >
                          Remove
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>

                <input
                  form="siteIconUploadForm"
                  id="siteIconFileInput"
                  type="file"
                  name="icon"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  class="site-icon-field__file-input"
                  onchange="document.getElementById('siteIconUploadForm').requestSubmit()"
                />

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

                <!-- Timezone & Date Format -->
                <div class="form__row form__row--2col">
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
                     <h2>Content Settings</h2>
                     <p>Control how content is published and displayed</p>
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
                  <input type="hidden" name="enableComments" value="false" />
                  <label class="form__checkbox-wrapper">
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
                  <input type="hidden" name="moderateComments" value="false" />
                  <label class="form__checkbox-wrapper">
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
                     <h2>Security</h2>
                     <p>Protect your account and manage access</p>
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
                  <input type="hidden" name="requireStrongPasswords" value="false" />
                  <label class="form__checkbox-wrapper">
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
                  <input type="hidden" name="twoFactorAuth" value="false" />
                  <label class="form__checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="twoFactorAuthCheckbox"
                      name="twoFactorAuth"
                      value="true"
                      ${siteTwoFactorOn ? 'checked' : ''}
                      class="form__checkbox"
                    />
                    <span>Require two-factor authentication for admin login</span>
                  </label>
                  <p class="form-feedback form-feedback--hint">
                    When saved, all admin accounts must use an authenticator at sign-in. Other users can enable or disable 2FA on their profile.
                  </p>
                </div>

                <div
                  class="form__group totp-account-section"
                  id="totpAccountSection"
                  data-enrolled="${userEnrolled ? 'true' : 'false'}"
                  data-pending="${userPending ? 'true' : 'false'}"
                >
                  <span class="site-icon-field__title">Your account</span>
                  ${userEnrolled ? `
                    <p class="form-feedback form-feedback--success">
                      Your authenticator is configured on this account.
                    </p>
                  ` : userPending ? `
                    <p class="form-feedback form-feedback--warning">
                      Setup was started but not completed. Continue with your existing code or start over with a new QR code.
                    </p>
                    <div class="totp-account-section__actions">
                      <button type="button" class="btn btn--outline" onclick="openTotpSetupModal()">
                        Continue setup
                      </button>
                      <button
                        type="button"
                        class="btn btn--ghost btn--sm"
                        onclick="openTotpSetupModal(true)"
                      >
                        Start over
                      </button>
                    </div>
                  ` : `
                    <p class="form-feedback form-feedback--hint">
                      Set up an authenticator on your admin account before requiring 2FA site-wide.
                    </p>
                    <button type="button" class="btn btn--outline" onclick="openTotpSetupModal()">
                      Set up authenticator
                    </button>
                  `}
                  <button
                    type="button"
                    id="totpEnrollResetTrigger"
                    class="hidden"
                    hx-post="/admin/users/${safeUserId}/totp/enroll?context=settings&amp;reset=true"
                    hx-target="#totpSetupBody"
                    hx-swap="innerHTML"
                  ></button>
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
                     <h2>Email Settings</h2>
                     <p>Configure email notifications and SMTP</p>
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
                   <p>Email configuration coming soon. Contact your administrator to configure SMTP settings.</p>
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
                     <h2>Social Media</h2>
                     <p>Link your social media accounts</p>
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

    ${totpSetupModal({ userId: user?.id || '' })}

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

  return content;
}

export function settingsMeta() {
  return {
    title: 'Settings',
    description: 'Configure your site preferences',
    activeRoute: '/admin/settings',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Settings', url: '/admin/settings' },
    ],
  };
}
