// src/admin/routes/tags.routes.js
// Tags routes - admin tag management

import { tagsController } from '../controllers/tags.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createTagSchema, updateTagSchema } from '../schemas/tag.schema.js';
import { listQuerySchema, resourceIdSchema, slugQuerySchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function tagsRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(listQuerySchema)],
    handler: tagsController.list.bind(tagsController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: tagsController.showNewForm.bind(tagsController),
  });

  fastify.post('/', {
    preHandler: [auth, validateBody(createTagSchema)],
    handler: tagsController.create.bind(tagsController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: tagsController.showEditForm.bind(tagsController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateTagSchema)],
    handler: tagsController.update.bind(tagsController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: tagsController.delete.bind(tagsController),
  });

  fastify.get('/check-slug', {
    preHandler: [auth, validateQuery(slugQuerySchema)],
    handler: tagsController.checkSlug.bind(tagsController),
  });
}
