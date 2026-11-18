import fastifyHtml from 'fastify-html';
import { buildAuthShell } from './templates/layouts/auth.js';
import { resolvePageMeta, renderOgMetaTags } from '../lib/site-meta.js';
import { faviconHref } from '../lib/favicon.js';

/**
 * Encapsulated auth plugin for /admin/auth/* pages.
 */
export default async function adminAuthPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const pageMeta = reply.request.templateMeta ?? {};
    const siteMap = reply.request.siteSettingsMap ?? {};
    const siteName = String(siteMap.siteName || 'BlogCMS');
    // See src/admin/plugin.js: the route resolves the configured icon and
    // falls back when the file is missing.
    const favicon = faviconHref(siteMap.siteIcon);
    const resolved = resolvePageMeta(siteMap, {
      title: pageMeta.title,
      description: pageMeta.description,
      path: reply.request.url,
    });

    return buildAuthShell({
      title: pageMeta.title ?? 'Sign In',
      description: resolved.description || pageMeta.description || 'Sign in to your account',
      siteName,
      favicon,
      ogMeta: renderOgMetaTags(resolved),
      body: inner,
    });
  }, { skipOnHeader: 'hx-request' });

  await fastify.register(import('./routes/auth.routes.js'), { prefix: '/admin/auth' });
}
