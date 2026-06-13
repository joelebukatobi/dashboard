// src/admin/routes/api/tags.routes.js
// Public API routes for tags

import { tagsAPIController } from '../../controllers/api/tags.controller.js';
import { validateParams, validateQuery } from '../../middleware/validate.js';
import { apiPaginationQuerySchema, slugParamSchema } from '../../schemas/common.schema.js';

export default async function tagsAPIRoutes(fastify) {
  fastify.get('/', {
    handler: tagsAPIController.list.bind(tagsAPIController),
  });

  fastify.get('/:slug/posts', {
    preHandler: [validateParams(slugParamSchema), validateQuery(apiPaginationQuerySchema)],
    handler: tagsAPIController.getPostsByTag.bind(tagsAPIController),
  });
}
