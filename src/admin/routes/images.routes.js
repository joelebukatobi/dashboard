// src/admin/routes/images.routes.js
// Images routes - admin media library

import { imagesController } from '../controllers/images.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { updateMediaSchema } from '../schemas/media.schema.js';
import { listQuerySchema, resourceIdSchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function imagesRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(listQuerySchema)],
    handler: imagesController.list.bind(imagesController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: imagesController.showNewForm.bind(imagesController),
  });

  fastify.post('/', {
    preHandler: auth,
    handler: imagesController.upload.bind(imagesController),
  });

  fastify.get('/batch', {
    preHandler: auth,
    handler: imagesController.showBatchForm.bind(imagesController),
  });

  fastify.post('/batch', {
    preHandler: auth,
    handler: imagesController.batchUpload.bind(imagesController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: imagesController.showEditForm.bind(imagesController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateMediaSchema)],
    handler: imagesController.update.bind(imagesController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: imagesController.delete.bind(imagesController),
  });
}
