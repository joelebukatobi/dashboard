/**
 * Branded transactional email HTML (inline CSS, table layout for client compatibility).
 */

const COLORS = {
  black: '#181818',
  orange: '#ea580c',
  body: '#646464',
  muted: '#909090',
  footer: '#a6a6a6',
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#f0f0f0',
};

const ICONS = {
  invite: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="8" y="16" width="48" height="36" rx="4" stroke="${COLORS.orange}" stroke-width="2.5"/><path d="M8 22l32 20 32-20" stroke="${COLORS.orange}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="20" r="10" fill="${COLORS.orange}"/><path d="M44 20l3 3 6-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  reset: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="16" y="28" width="32" height="24" rx="4" stroke="${COLORS.black}" stroke-width="2.5"/><path d="M24 28v-6a8 8 0 0 1 16 0v6" stroke="${COLORS.black}" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="40" r="4" fill="${COLORS.orange}"/></svg>`,
  test: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="32" cy="32" r="24" stroke="${COLORS.orange}" stroke-width="2.5"/><path d="M22 32l7 7 13-14" stroke="${COLORS.orange}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolveSiteUrl(map = {}) {
  return String(map.siteUrl || '').trim().replace(/\/$/, '') || 'http://localhost:3000';
}

function resolveSiteName(map = {}) {
  return String(map.siteName || 'Dashboard').trim() || 'Dashboard';
}

/**
 * Email clients often block SVG images. The app serves the configured site icon at /favicon.ico.
 */
function resolveEmailLogoUrl(map = {}) {
  const siteUrl = resolveSiteUrl(map);
  const icon = String(map.siteIcon || '').trim();

  if (icon && !icon.endsWith('.svg') && icon !== '/favicon.svg') {
    if (/^https?:\/\//i.test(icon)) return icon;
    if (icon.startsWith('/public/')) return `${siteUrl}${icon}`;
    if (icon.startsWith('/uploads/')) return `${siteUrl}${icon}`;
    return `${siteUrl}${icon.startsWith('/') ? icon : `/${icon}`}`;
  }

  return `${siteUrl}/favicon.ico`;
}

/**
 * @param {object} options
 * @param {Record<string, unknown>} options.settingsMap
 * @param {string} options.iconKey - invite | reset | test
 * @param {string} options.headline
 * @param {string} options.bodyHtml - already-safe HTML paragraphs
 * @param {string} [options.ctaLabel]
 * @param {string} [options.ctaUrl]
 * @param {string} options.footerNote
 */
export function renderBrandedEmail({
  settingsMap,
  iconKey,
  headline,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}) {
  const siteName = escapeHtml(toTitleCase(resolveSiteName(settingsMap)));
  const iconUrl = escapeHtml(resolveEmailLogoUrl(settingsMap));
  const heroIcon = ICONS[iconKey] || ICONS.test;
  const safeHeadline = escapeHtml(toTitleCase(headline));
  const safeFooter = escapeHtml(footerNote);
  const safeCtaLabel = ctaLabel ? escapeHtml(toTitleCase(ctaLabel)) : '';
  const safeCtaUrl = ctaUrl ? escapeHtml(ctaUrl) : '';

  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr>
        <td style="padding:24px 40px 8px;">
          <a href="${safeCtaUrl}" style="display:block;text-align:center;background:${COLORS.orange};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 24px;border-radius:8px;text-transform:capitalize;">${safeCtaLabel}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 40px 24px;font-size:13px;line-height:1.6;color:${COLORS.muted};text-align:center;">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="${safeCtaUrl}" style="color:${COLORS.orange};word-break:break-all;">${safeCtaUrl}</a>
        </td>
      </tr>`
    : `<tr><td style="padding:8px 40px 24px;"></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeHeadline}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${COLORS.card};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <img src="${iconUrl}" alt="${siteName}" width="40" height="40" style="display:block;margin:0 auto;border:0;outline:none;width:40px;height:40px;" />
              <div style="font-size:14px;font-weight:600;color:${COLORS.black};margin-top:10px;letter-spacing:0.02em;text-transform:capitalize;">${siteName}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">${heroIcon}</td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;text-align:center;font-size:22px;font-weight:700;line-height:1.3;color:${COLORS.black};text-transform:capitalize;">${safeHeadline}</td>
          </tr>
          <tr>
            <td style="padding:12px 40px 0;text-align:center;font-size:15px;line-height:1.65;color:${COLORS.body};">${bodyHtml}</td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:0 40px 32px;font-size:12px;line-height:1.6;color:${COLORS.footer};text-align:center;border-top:1px solid ${COLORS.border};">
              <p style="margin:24px 0 0;">${safeFooter}</p>
              <p style="margin:12px 0 0;">&copy; ${new Date().getFullYear()} ${siteName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderInviteEmail(settingsMap, { firstName, invitedByName, actionUrl }) {
  const siteName = escapeHtml(toTitleCase(resolveSiteName(settingsMap)));
  const name = firstName ? ` ${escapeHtml(firstName)}` : '';
  const invitedBy = invitedByName
    ? `<strong>${escapeHtml(invitedByName)}</strong> has invited you`
    : 'You have been invited';

  return renderBrandedEmail({
    settingsMap,
    iconKey: 'invite',
    headline: `join ${resolveSiteName(settingsMap)}`,
    bodyHtml: `<p style="margin:0 0 12px;">Hi${name},</p><p style="margin:0;">${invitedBy} to join the ${siteName} dashboard. Set your password to activate your account.</p>`,
    ctaLabel: 'accept invitation',
    ctaUrl: actionUrl,
    footerNote: 'This invitation link expires in 7 days. If you were not expecting this email, you can ignore it.',
  });
}

export function renderPasswordResetEmail(settingsMap, { firstName, actionUrl }) {
  const siteName = escapeHtml(toTitleCase(resolveSiteName(settingsMap)));
  const name = firstName ? ` ${escapeHtml(firstName)}` : '';

  return renderBrandedEmail({
    settingsMap,
    iconKey: 'reset',
    headline: 'reset your password',
    bodyHtml: `<p style="margin:0 0 12px;">Hi${name},</p><p style="margin:0;">We received a request to reset your password for ${siteName}. Click the button below to choose a new password.</p>`,
    ctaLabel: 'reset password',
    ctaUrl: actionUrl,
    footerNote: 'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.',
  });
}

export function renderTestEmail(settingsMap, { actionUrl }) {
  const siteName = escapeHtml(toTitleCase(resolveSiteName(settingsMap)));

  return renderBrandedEmail({
    settingsMap,
    iconKey: 'test',
    headline: 'smtp test successful',
    bodyHtml: `<p style="margin:0;">This is a test email from <strong>${siteName}</strong>. Your SMTP settings are working correctly.</p>`,
    ctaLabel: 'open dashboard',
    ctaUrl: actionUrl,
    footerNote: 'You can close this message. No further action is required.',
  });
}
