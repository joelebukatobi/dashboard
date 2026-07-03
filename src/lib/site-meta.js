/**
 * Layered page meta: site defaults + page overrides.
 */

/**
 * @param {Record<string, unknown>} siteSettings
 * @param {object} [page]
 * @param {string} [page.title]
 * @param {string} [page.description]
 * @param {string} [page.path] - Path appended to siteUrl for og:url
 * @param {string} [page.image]
 * @param {string} [page.ogTitle]
 * @param {string} [page.ogDescription]
 * @param {string} [page.ogUrl]
 * @param {string} [page.ogImage]
 */
export function resolvePageMeta(siteSettings = {}, page = {}) {
  const siteName = String(siteSettings.siteName || 'BlogCMS');
  const siteTagline = String(siteSettings.siteTagline || '');
  const siteUrl = String(siteSettings.siteUrl || '').replace(/\/$/, '');
  const siteIcon = String(siteSettings.siteIcon || '/favicon.svg');
  const path = page.path || '';

  const title = page.title || siteName;
  const description = page.description || siteTagline;
  const ogUrl = page.ogUrl || (siteUrl && path ? `${siteUrl}${path}` : siteUrl || '');
  const ogImage = page.ogImage || page.image || siteIcon;

  return {
    title,
    description,
    siteName,
    siteIcon,
    ogTitle: page.ogTitle || title,
    ogDescription: page.ogDescription || description,
    ogUrl,
    ogImage,
    ogSiteName: siteName,
  };
}

/**
 * Render Open Graph and Twitter meta tags.
 * @param {ReturnType<typeof resolvePageMeta>} meta
 */
export function renderOgMetaTags(meta) {
  const tags = [
    ['og:title', meta.ogTitle],
    ['og:description', meta.ogDescription],
    ['og:site_name', meta.ogSiteName],
    ['twitter:card', 'summary'],
    ['twitter:title', meta.ogTitle],
    ['twitter:description', meta.ogDescription],
  ];

  if (meta.ogUrl) tags.push(['og:url', meta.ogUrl]);
  if (meta.ogImage) {
    tags.push(['og:image', meta.ogImage]);
    tags.push(['twitter:image', meta.ogImage]);
  }

  return tags
    .filter(([, content]) => content)
    .map(([property, content]) => {
      const attr = property.startsWith('twitter:') ? 'name' : 'property';
      const escaped = String(content)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
      return `<meta ${attr}="${property}" content="${escaped}" />`;
    })
    .join('\n    ');
}
