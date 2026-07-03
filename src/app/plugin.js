import fastifyHtml from 'fastify-html';
import {
  buildAppShell,
  buildBlogShell,
  buildComingSoonShell,
  buildAppErrorShell,
} from './templates/layouts/app.js';
import { resolvePageMeta, renderOgMetaTags } from '../lib/site-meta.js';

/**
 * Encapsulated public app plugin.
 * Registers fastify-html layout for /, /blog/* routes.
 */
export default async function appPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const pageMeta = reply.request.templateMeta ?? {};
    const siteMap = reply.request.siteSettingsMap ?? {};
    const siteName = String(siteMap.siteName || 'BlogCMS');
    const siteIcon = String(siteMap.siteIcon || '');
    const favicon = siteIcon || '/favicon.svg';
    const resolved = resolvePageMeta(siteMap, {
      title: pageMeta.title,
      description: pageMeta.description,
      path: reply.request.url,
      image: pageMeta.image,
    });
    const ogMeta = renderOgMetaTags(resolved);
    const layoutProps = {
      title: resolved.title,
      siteName,
      favicon,
      ogMeta,
    };

    switch (pageMeta.layout) {
      case 'blog':
        return buildBlogShell({
          ...layoutProps,
          activeBlogNav: pageMeta.activeBlogNav ?? false,
          content: inner,
          footer: pageMeta.footer ?? '',
        });
      case 'coming-soon':
        return buildComingSoonShell({ content: inner, favicon, ogMeta });
      case 'error':
        return buildAppErrorShell({
          title: pageMeta.title ?? 'Error',
          content: inner,
          favicon,
          ogMeta,
        });
      case 'app':
      default:
        return buildAppShell({
          ...layoutProps,
          content: inner,
        });
    }
  }, { skipOnHeader: 'hx-request' });

  await fastify.register(import('./routes/public.routes.js'));
}
