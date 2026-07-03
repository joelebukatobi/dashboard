import fastifyHtml from 'fastify-html';
import { buildDashboardShell } from './templates/layouts/main.js';
import { resolvePageMeta, renderOgMetaTags } from '../lib/site-meta.js';

/**
 * Encapsulated admin dashboard plugin.
 * Registers fastify-html layout for authenticated /admin/* routes.
 */
export default async function adminPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const pageMeta = reply.request.templateMeta ?? {};
    const siteMap = reply.request.siteSettingsMap ?? {};
    const siteName = String(siteMap.siteName || 'BlogCMS');
    const siteIcon = String(siteMap.siteIcon || '');
    const siteUrl = String(siteMap.siteUrl || '/').trim() || '/';
    const favicon = siteIcon || '/favicon.svg';
    const resolved = resolvePageMeta(siteMap, {
      title: pageMeta.title,
      description: pageMeta.description,
      path: reply.request.url,
    });

    return buildDashboardShell({
      title: pageMeta.title ?? 'Dashboard',
      description: resolved.description || pageMeta.description || 'BlogCMS Dashboard',
      content: inner,
      user: reply.request.user,
      activeRoute: pageMeta.activeRoute ?? '/admin',
      breadcrumbs: pageMeta.breadcrumbs ?? [],
      modals: pageMeta.modals ?? '',
      siteName,
      siteIcon,
      siteUrl,
      favicon,
      ogMeta: renderOgMetaTags(resolved),
    });
  }, { skipOnHeader: 'hx-request' });

  await fastify.register(import('./routes/dashboard.routes.js'), { prefix: '/admin' });
  await fastify.register(import('./routes/posts.routes.js'), { prefix: '/admin/posts' });
  await fastify.register(import('./routes/comments.routes.js'), { prefix: '/admin/posts/:postId/comments' });
  await fastify.register(import('./routes/categories.routes.js'), { prefix: '/admin/categories' });
  await fastify.register(import('./routes/tags.routes.js'), { prefix: '/admin/tags' });
  await fastify.register(import('./routes/users.routes.js'), { prefix: '/admin/users' });
  await fastify.register(import('./routes/subscribers.routes.js'), { prefix: '/admin/subscribers' });
  await fastify.register(import('./routes/images.routes.js'), { prefix: '/admin/media/images' });
  await fastify.register(import('./routes/videos.routes.js'), { prefix: '/admin/media/videos' });
  await fastify.register(import('./routes/albums.routes.js'), { prefix: '/admin/media/albums' });
  await fastify.register(import('./routes/settings.routes.js'), { prefix: '/admin/settings' });
}
