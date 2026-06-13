// src/admin/routes/api/posts.routes.js
// Public API routes for posts

import { postsAPIController } from '../../controllers/api/posts.controller.js';
import { validateParams, validateQuery } from '../../middleware/validate.js';
import { apiPaginationQuerySchema, slugParamSchema } from '../../schemas/common.schema.js';

export default async function postsAPIRoutes(fastify) {
  fastify.get('/', {
    preHandler: validateQuery(apiPaginationQuerySchema),
    handler: postsAPIController.list.bind(postsAPIController),
  });

  fastify.get('/:slug', {
    preHandler: validateParams(slugParamSchema),
    handler: postsAPIController.getBySlug.bind(postsAPIController),
  });
}
