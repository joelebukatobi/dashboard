// src/admin/routes/api/categories.routes.js
// Public API routes for categories

import { categoriesAPIController } from '../../controllers/api/categories.controller.js';
import { validateParams, validateQuery } from '../../middleware/validate.js';
import { apiPaginationQuerySchema, slugParamSchema } from '../../schemas/common.schema.js';

export default async function categoriesAPIRoutes(fastify) {
  fastify.get('/', {
    handler: categoriesAPIController.list.bind(categoriesAPIController),
  });

  fastify.get('/:slug/posts', {
    preHandler: [validateParams(slugParamSchema), validateQuery(apiPaginationQuerySchema)],
    handler: categoriesAPIController.getPostsByCategory.bind(categoriesAPIController),
  });
}
