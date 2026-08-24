// src/admin/templates/pages/settings/settings.js
// Settings Page - Individual section forms with accordion

import { escapeHtml, toastQueryScript } from '../../utils/helpers.js';
import { totpSetupModal } from '../../partials/totp-setup.js';
import { ghostPasswordField } from '../../partials/ghost-password-field.js';
import {
  BUILTIN_SOCIAL_PLATFORMS,
  normalizeSocialLinks,
  normalizeSocialHiddenPlatforms,
} from '../../../../lib/social-links.js';
import { SMTP_SECURE_OPTIONS } from '../../../../lib/mail-settings.js';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY' },
];

function renderSelectOptions(options, selectedValue, defaultValue = '') {
  const currentValue = selectedValue ?? defaultValue;

  return options.map((option) => `
    <option value="${option.value}" ${currentValue === option.value ? 'selected' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

function renderFormSelect(name, options, selectedValue, defaultValue, placeholder) {
  return `
    <select
      name="${name}"
      class="hidden"
      data-hs-select='{
        "placeholder": "${placeholder}",
        "toggleClasses": "form__select-toggle",
        "dropdownClasses": "form__select-dropdown",
        "optionClasses": "form__select-option"
      }'
    >
      ${renderSelectOptions(options, selectedValue, defaultValue)}
    </select>
  `;
}

function renderSocialLinkRemoveButton(onclick) {
  return `
    <div class="form__group social-links-field__remove">
      <label class="label" aria-hidden="true">&nbsp;</label>
      <button
        type="button"
        class="btn btn--outline btn--danger btn--icon"
        onclick="${onclick}"
        title="Remove"
        aria-label="Remove social link"
      >
        <i data-lucide="trash-2" stroke-width="1"></i>
      </button>
    </div>
  `;
}

function renderBuiltinSocialRow(platform, url = '') {
  return `
    <div class="social-links-field__row" data-social-link-row data-builtin="${platform.key}">
      <div class="form__group">
        <label class="label">Platform</label>
        <p class="social-links-field__platform">${escapeHtml(platform.label)}</p>
      </div>
      <div class="form__group">
        <label class="label">URL</label>
        <input
          type="url"
          class="input"
          name="${platform.key}"
          value="${escapeHtml(url)}"
          placeholder="${escapeHtml(platform.placeholder)}"
        />
      </div>
      ${renderSocialLinkRemoveButton(`removeBuiltinSocialLink(this, '${platform.key}')`)}
    </div>
  `;
}

function renderSocialLinkRow(label = '', url = '') {
  return `
    <div class="social-links-field__row" data-social-link-row>
      <div class="form__group">
        <label class="label">Label</label>
        <input
          type="text"
          class="input"
          name="socialLinkLabel"
          value="${escapeHtml(label)}"
          placeholder="e.g. Instagram"
        />
      </div>
      <div class="form__group">
        <label class="label">URL</label>
        <input
          type="url"
          class="input"
          name="socialLinkUrl"
          value="${escapeHtml(url)}"
          placeholder="https://instagram.com/yourhandle"
        />
      </div>
      ${renderSocialLinkRemoveButton('removeSocialLinkRow(this)')}
    </div>
  `;
}

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

  const socialLinks = normalizeSocialLinks(getSetting('SOCIAL', 'socialLinks', []));
  const socialLinksHtml = socialLinks.map((link) => renderSocialLinkRow(link.label, link.url)).join('');
  const hiddenSocialPlatforms = normalizeSocialHiddenPlatforms(getSetting('SOCIAL', 'socialHiddenPlatforms', []));
  const visibleBuiltinPlatforms = BUILTIN_SOCIAL_PLATFORMS.filter(
    (platform) => !hiddenSocialPlatforms.includes(platform.key),
  );
  const builtinSocialHtml = visibleBuiltinPlatforms
    .map((platform) => renderBuiltinSocialRow(platform, getSetting('SOCIAL', platform.key, '')))
    .join('');
  const hiddenSocialPlatformsJson = escapeHtml(JSON.stringify(hiddenSocialPlatforms));
  const smtpPasswordConfigured = Boolean(String(getSetting('EMAIL', 'smtpPassword', '')).trim());

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
                          class="btn btn--outline btn--danger btn--sm site-icon-field__remove"
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

                <hr class="form__divider" />

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

                <!-- Site URL, Timezone & Date Format -->
                <div class="form__row form__row--3col">
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
                  <div class="form__group">
                    <label class="label">Timezone</label>
                    ${renderFormSelect(
                      'timezone',
                      TIMEZONE_OPTIONS,
                      getSetting('GENERAL', 'timezone', 'UTC'),
                      'UTC',
                      'Select timezone...',
                    )}
                  </div>
                  <div class="form__group">
                    <label class="label">Date Format</label>
                    ${renderFormSelect(
                      'dateFormat',
                      DATE_FORMAT_OPTIONS,
                      getSetting('GENERAL', 'dateFormat', 'MM/DD/YYYY'),
                      'MM/DD/YYYY',
                      'Select date format...',
                    )}
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
                <div class="form__row form__row--2col">
                  <div class="form__group">
                    <label class="label">SMTP Host</label>
                    <input
                      type="text"
                      class="input"
                      name="smtpHost"
                      value="${escapeHtml(getSetting('EMAIL', 'smtpHost', ''))}"
                      placeholder="mail.yourdomain.com"
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">SMTP Port</label>
                    <input
                      type="number"
                      class="input"
                      name="smtpPort"
                      value="${escapeHtml(String(getSetting('EMAIL', 'smtpPort', '587')))}"
                      min="1"
                      max="65535"
                    />
                  </div>
                </div>

                <div class="form__row form__row--3col">
                  <div class="form__group">
                    <label class="label">Encryption</label>
                    ${renderFormSelect(
                      'smtpSecure',
                      SMTP_SECURE_OPTIONS,
                      getSetting('EMAIL', 'smtpSecure', 'tls'),
                      'tls',
                      'Select encryption...',
                    )}
                  </div>
                  <div class="form__group">
                    <label class="label">SMTP Username</label>
                    <input
                      type="text"
                      class="input"
                      name="smtpUser"
                      value="${escapeHtml(getSetting('EMAIL', 'smtpUser', ''))}"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  ${smtpPasswordConfigured
                    ? ghostPasswordField({
                      id: 'smtpPassword',
                      name: 'smtpPassword',
                      label: 'SMTP Password',
                      autocomplete: 'new-password',
                      hint: 'Leave blank to keep the current password.',
                    })
                    : `
                  <div class="form__group">
                    <label class="label" for="smtpPassword">SMTP Password</label>
                    <input
                      type="password"
                      class="input"
                      id="smtpPassword"
                      name="smtpPassword"
                      autocomplete="new-password"
                    />
                  </div>
                  `}
                </div>

                <div class="form__row form__row--3col">
                  <div class="form__group">
                    <label class="label">From Name</label>
                    <input
                      type="text"
                      class="input"
                      name="emailFromName"
                      value="${escapeHtml(getSetting('EMAIL', 'emailFromName', getSetting('GENERAL', 'siteName', '')))}"
                      placeholder="Site name"
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">From Email</label>
                    <input
                      type="email"
                      class="input"
                      name="emailFromAddress"
                      value="${escapeHtml(getSetting('EMAIL', 'emailFromAddress', ''))}"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div class="form__group">
                    <label class="label">Reply-To</label>
                    <input
                      type="email"
                      class="input"
                      name="emailReplyTo"
                      value="${escapeHtml(getSetting('EMAIL', 'emailReplyTo', ''))}"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div class="form__group">
                  <label class="label">Send test email to</label>
                  <div class="form__inline-actions">
                    <input
                      type="email"
                      class="input"
                      id="testEmailTo"
                      name="testEmailTo"
                      value="${escapeHtml(user?.email || '')}"
                    />
                    <button
                      type="button"
                      class="btn btn--outline btn--lg"
                      hx-post="/admin/settings/email/test"
                      hx-target="#form-response"
                      hx-swap="innerHTML"
                      hx-include="#testEmailTo, #settings-csrf"
                    >
                      Send Test Mail
                    </button>
                  </div>
                  <p class="form-feedback form-feedback--hint">Save SMTP settings first, then send a test email to verify shared-hosting credentials.</p>
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
                <div class="social-links-field">
                  <div id="socialBuiltinList" class="social-links-field__list">
                    ${builtinSocialHtml}
                  </div>
                  <div id="socialRestoreField" class="social-links-field__restore${hiddenSocialPlatforms.length ? '' : ' hidden'}">
                    <select id="restoreSocialPlatform" class="select">
                      <option value="">Restore platform…</option>
                      ${hiddenSocialPlatforms.map((key) => {
                        const platform = BUILTIN_SOCIAL_PLATFORMS.find((item) => item.key === key);
                        return platform
                          ? `<option value="${platform.key}">${escapeHtml(platform.label)}</option>`
                          : '';
                      }).join('')}
                    </select>
                    <button
                      type="button"
                      class="btn btn--outline"
                      onclick="restoreBuiltinSocialLink(this)"
                    >
                      Restore platform
                    </button>
                  </div>
                </div>

                <div class="social-links-field social-links-field--additional">
                  <div class="social-links-field__header">
                    <h3 class="social-links-field__title">Additional links</h3>
                    <p class="form-feedback form-feedback--hint">Add custom platforms like Instagram or TikTok.</p>
                  </div>
                  <div id="socialLinksList" class="social-links-field__list">
                    ${socialLinksHtml}
                  </div>
                  <button
                    type="button"
                    class="btn btn--outline"
                    onclick="addSocialLinkRow(this)"
                  >
                    Add Social Media
                  </button>
                </div>

                <template id="socialLinkRowTemplate">
                  ${renderSocialLinkRow()}
                </template>

                ${BUILTIN_SOCIAL_PLATFORMS.map((platform) => `
                  <template id="socialBuiltinTemplate-${platform.key}">
                    ${renderBuiltinSocialRow(platform)}
                  </template>
                `).join('')}

                <input
                  type="hidden"
                  id="socialHiddenPlatforms"
                  name="socialHiddenPlatforms"
                  value="${hiddenSocialPlatformsJson}"
                />

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

      function getSocialHiddenPlatforms() {
        const hidden = document.getElementById('socialHiddenPlatforms');
        if (!hidden) return [];

        try {
          const parsed = JSON.parse(hidden.value || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      function setSocialHiddenPlatforms(keys) {
        const hidden = document.getElementById('socialHiddenPlatforms');
        if (hidden) hidden.value = JSON.stringify(keys);
        updateSocialRestoreField(keys);
      }

      function updateSocialRestoreField(keys) {
        const restoreField = document.getElementById('socialRestoreField');
        const select = document.getElementById('restoreSocialPlatform');
        if (!restoreField || !select) return;

        const labels = {
          socialTwitter: 'Twitter/X',
          socialFacebook: 'Facebook',
          socialLinkedIn: 'LinkedIn',
          socialGitHub: 'GitHub',
        };

        select.innerHTML = '<option value="">Restore platform…</option>';
        keys.forEach(function(key) {
          if (!labels[key]) return;
          const option = document.createElement('option');
          option.value = key;
          option.textContent = labels[key];
          select.appendChild(option);
        });

        restoreField.classList.toggle('hidden', keys.length === 0);
      }

      function clearBuiltinSocialInput(form, key) {
        if (!form) return;

        const existing = form.querySelector('input[data-cleared="' + key + '"]');
        if (existing) return;

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = '';
        input.dataset.cleared = key;
        form.appendChild(input);
      }

      function removeBuiltinSocialLink(button, key) {
        const row = button.closest('[data-social-link-row]');
        const form = button.closest('form');
        if (row) row.remove();

        clearBuiltinSocialInput(form, key);

        const hiddenKeys = getSocialHiddenPlatforms();
        if (!hiddenKeys.includes(key)) hiddenKeys.push(key);
        setSocialHiddenPlatforms(hiddenKeys);

        if (button) button.blur();
      }

      function restoreBuiltinSocialLink(button) {
        const select = document.getElementById('restoreSocialPlatform');
        const list = document.getElementById('socialBuiltinList');
        const key = select ? select.value : '';
        if (!key || !list) return;

        const template = document.getElementById('socialBuiltinTemplate-' + key);
        if (!template) return;

        list.appendChild(template.content.firstElementChild.cloneNode(true));

        const hiddenKeys = getSocialHiddenPlatforms().filter(function(item) {
          return item !== key;
        });
        setSocialHiddenPlatforms(hiddenKeys);

        const form = button.closest('form');
        const clearedInput = form ? form.querySelector('input[data-cleared="' + key + '"]') : null;
        if (clearedInput) clearedInput.remove();

        if (select) select.value = '';
        if (window.lucide) window.lucide.createIcons();
        if (button) button.blur();
      }

      function addSocialLinkRow(button) {
        const list = document.getElementById('socialLinksList');
        const template = document.getElementById('socialLinkRowTemplate');
        if (!list || !template) return;

        list.appendChild(template.content.firstElementChild.cloneNode(true));
        if (window.lucide) window.lucide.createIcons();
        if (button) button.blur();
      }

      function removeSocialLinkRow(button) {
        const row = button.closest('[data-social-link-row]');
        if (row) row.remove();
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
