import fastifyHtml from 'fastify-html';
import { buildAuthShell } from './templates/layouts/auth.js';

/**
 * Encapsulated auth plugin for /admin/auth/* pages.
 */
export default async function adminAuthPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const meta = reply.request.templateMeta ?? {};

    return buildAuthShell({
      title: meta.title ?? 'Sign In',
      description: meta.description ?? 'Sign in to your account',
      body: inner,
    });
  }, { skipOnHeader: 'hx-request' });

  await fastify.register(import('./routes/auth.routes.js'), { prefix: '/admin/auth' });
}
