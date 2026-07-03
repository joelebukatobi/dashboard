// HTMX fragment: 2FA enrollment for settings modal or inline setup

import { escapeHtml } from '../utils/helpers.js';
import { modal, modalScript } from '../components/modal.js';

/** Centered spinner shown while the QR code is being generated. */
export function totpLoadingHtml() {
  return `
    <div class="totp-setup totp-setup--loading">
      <div class="spinner" role="status" aria-label="Loading"></div>
      <p class="modal__description">Generating your QR code…</p>
    </div>
  `;
}

function totpVerifyFormHtml(userId) {
  return `
    <form
      class="form totp-setup__form"
      hx-post="/admin/users/${escapeHtml(userId)}/totp/verify?context=settings"
      hx-target="#totpSetupBody"
      hx-swap="innerHTML"
    >
      <div class="form__group">
        <label class="label" for="totp-setup-code">Verification code</label>
        <input
          type="text"
          id="totp-setup-code"
          name="code"
          class="input"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="000000"
          required
        />
      </div>
      <button type="submit" class="btn btn--primary btn--full">Verify &amp; Enable</button>
    </form>
  `;
}

/**
 * @param {{ userId: string, totpEnroll?: { qrDataUrl?: string, pending?: boolean } | null, totpEnabled?: boolean }} options
 */
export function totpSetupFragment({ userId, totpEnroll = null, totpEnabled = false }) {
  if (totpEnabled) {
    return `
      <div class="totp-setup totp-setup--complete">
        <p class="form-feedback form-feedback--success">Two-factor authentication is enabled on your account.</p>
      </div>
    `;
  }

  if (totpEnroll?.qrDataUrl || totpEnroll?.pending) {
    const qrBlock = totpEnroll.qrDataUrl
      ? `<div class="totp-setup__qr"><img src="${escapeHtml(totpEnroll.qrDataUrl)}" alt="2FA QR code" width="200" height="200" /></div>`
      : '';
    const pendingHint = totpEnroll.pending && !totpEnroll.qrDataUrl
      ? '<p class="modal__description">Enter the code from the authenticator you already scanned.</p>'
      : '<p class="modal__description">Scan this QR code with your authenticator app, then enter the verification code below.</p>';

    return `
      <div class="totp-setup">
        ${pendingHint}
        ${qrBlock}
        ${totpVerifyFormHtml(userId)}
      </div>
    `;
  }

  return totpLoadingHtml();
}

/**
 * Modal shell for 2FA setup on the settings page.
 * @param {{ userId: string }} options
 */
export function totpSetupModal({ userId }) {
  const safeUserId = escapeHtml(userId);
  const content = `
    <div class="modal__header">
      <div class="modal__icon">
        <i data-lucide="shield-check"></i>
      </div>
      <h3 id="totpSetupModalLabel" class="modal__title">Set Up Two-Factor Authentication</h3>
      <p class="modal__description">Configure an authenticator app on your admin account.</p>
    </div>
    <div class="px-6 pb-8">
      <div id="totpSetupBody">
        ${totpLoadingHtml()}
      </div>
      <button
        type="button"
        id="totpEnrollTrigger"
        class="hidden"
        hx-post="/admin/users/${safeUserId}/totp/enroll?context=settings"
        hx-target="#totpSetupBody"
        hx-swap="innerHTML"
      ></button>
    </div>
  `;

  return `
    ${modal({
      id: 'totpSetupModal',
      content,
      noFooter: true,
      highZIndex: true,
      closeHandler: 'closeTotpSetupModal()',
    })}
    ${modalScript()}
    <script>
      (function() {
        const loadingHtml = ${JSON.stringify(totpLoadingHtml())};

        function resetTotpSetupBody() {
          const body = document.getElementById('totpSetupBody');
          if (body) body.innerHTML = loadingHtml;
        }

        function triggerTotpEnroll(reset) {
          if (reset) {
            const resetTrigger = document.getElementById('totpEnrollResetTrigger');
            if (resetTrigger && typeof htmx !== 'undefined') {
              htmx.trigger(resetTrigger, 'click');
              return;
            }
          }
          const trigger = document.getElementById('totpEnrollTrigger');
          if (trigger && typeof htmx !== 'undefined') {
            htmx.trigger(trigger, 'click');
          }
        }

        window.openTotpSetupModal = function(reset) {
          openModal('totpSetupModal');
          resetTotpSetupBody();
          triggerTotpEnroll(Boolean(reset));
        };

        window.closeTotpSetupModal = function() {
          closeModal('totpSetupModal');
        };
      })();
    </script>
  `;
}
