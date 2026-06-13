// src/admin/routes/setup.routes.js
// Setup wizard routes

import fastifyHtml from 'fastify-html';
import { validateSetupToken } from '../../middleware/setup-guard.js';
import { validateSetupBody } from '../middleware/validate-setup.js';
import { showSetupForm, processSetup } from '../controllers/setup.controller.js';
import { buildAuthShell } from '../templates/layouts/auth.js';

export default async function setupRoutes(fastify, opts) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const meta = reply.request.templateMeta ?? {};

    return buildAuthShell({
      title: meta.title ?? 'Site Setup',
      description: meta.description ?? 'Create your admin account',
      body: inner,
    });
  }, { skipOnHeader: 'hx-request' });

  fastify.get('/setup', {
    preHandler: validateSetupToken,
    handler: showSetupForm,
  });

  fastify.post('/setup', {
    preHandler: [validateSetupToken, validateSetupBody()],
    handler: processSetup,
  });
}
