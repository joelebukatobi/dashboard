export const BUILTIN_SOCIAL_PLATFORMS = [
  {
    key: 'socialTwitter',
    label: 'Twitter/X',
    placeholder: 'https://twitter.com/yourhandle',
  },
  {
    key: 'socialFacebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/yourpage',
  },
  {
    key: 'socialLinkedIn',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/yourprofile',
  },
  {
    key: 'socialGitHub',
    label: 'GitHub',
    placeholder: 'https://github.com/yourusername',
  },
];

const BUILTIN_SOCIAL_KEYS = new Set(BUILTIN_SOCIAL_PLATFORMS.map((platform) => platform.key));

/**
 * Parse custom social link rows from settings form body.
 * @param {Record<string, unknown>} body
 * @returns {Array<{ label: string, url: string }>}
 */
export function parseSocialLinksFromBody(body) {
  const labels = toArray(body.socialLinkLabel);
  const urls = toArray(body.socialLinkUrl);
  const links = [];
  const count = Math.max(labels.length, urls.length);

  for (let i = 0; i < count; i++) {
    const label = String(labels[i] ?? '').trim();
    const url = String(urls[i] ?? '').trim();
    if (!label) continue;
    links.push({ label, url });
  }

  return links;
}

/**
 * Parse hidden built-in social platform keys from form body.
 * @param {Record<string, unknown>} body
 * @returns {string[]}
 */
export function parseSocialHiddenPlatformsFromBody(body) {
  return normalizeSocialHiddenPlatforms(parseBodyValue(body.socialHiddenPlatforms));
}

/**
 * Normalize stored hidden built-in platform keys.
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeSocialHiddenPlatforms(value) {
  let raw = value;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((key) => String(key ?? '').trim())
    .filter((key) => BUILTIN_SOCIAL_KEYS.has(key));
}

/**
 * Normalize stored socialLinks value for UI/API.
 * @param {unknown} value
 * @returns {Array<{ label: string, url: string }>}
 */
export function normalizeSocialLinks(value) {
  let raw = value;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      label: String(item.label ?? '').trim(),
      url: String(item.url ?? '').trim(),
    }))
    .filter((item) => item.label);
}

export function getBuiltinSocialPlatform(key) {
  return BUILTIN_SOCIAL_PLATFORMS.find((platform) => platform.key === key) ?? null;
}

function toArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((entry) => parseBodyValue(entry));
  return [parseBodyValue(value)];
}

function parseBodyValue(value) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}
