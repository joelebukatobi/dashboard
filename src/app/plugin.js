import fastifyHtml from 'fastify-html';
import {
  buildAppShell,
  buildBlogShell,
  buildComingSoonShell,
  buildAppErrorShell,
} from './templates/layouts/app.js';

/**
 * Encapsulated public app plugin.
 * Registers fastify-html layout for /, /blog/* routes.
 */
export default async function appPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const meta = reply.request.templateMeta ?? {};

    switch (meta.layout) {
      case 'blog':
        return buildBlogShell({
          title: meta.title ?? 'Blog',
          activeBlogNav: meta.activeBlogNav ?? false,
          content: inner,
          footer: meta.footer ?? '',
        });
      case 'coming-soon':
        return buildComingSoonShell({ content: inner });
      case 'error':
        return buildAppErrorShell({
          title: meta.title ?? 'Error',
          content: inner,
        });
      case 'app':
      default:
        return buildAppShell({
          title: meta.title ?? 'BlogCMS App',
          content: inner,
        });
    }
  }, { skipOnHeader: 'hx-request' });

  await fastify.register(import('./routes/public.routes.js'));
}
