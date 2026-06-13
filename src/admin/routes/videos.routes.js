// src/admin/routes/videos.routes.js
// Videos routes - admin media library

import { videosController } from '../controllers/videos.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { updateMediaSchema } from '../schemas/media.schema.js';
import { listQuerySchema, resourceIdSchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function videosRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(listQuerySchema)],
    handler: videosController.list.bind(videosController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: videosController.showNewForm.bind(videosController),
  });

  fastify.post('/', {
    preHandler: auth,
    handler: videosController.upload.bind(videosController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: videosController.showEditForm.bind(videosController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateMediaSchema)],
    handler: videosController.update.bind(videosController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: videosController.delete.bind(videosController),
  });
}
