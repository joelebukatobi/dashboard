// src/admin/routes/categories.routes.js
// Category routes

import { categoriesController } from '../controllers/categories.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import { listQuerySchema, resourceIdSchema, slugQuerySchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function categoryRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(listQuerySchema)],
    handler: categoriesController.list.bind(categoriesController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: categoriesController.showNewForm.bind(categoriesController),
  });

  fastify.post('/', {
    preHandler: [auth, validateBody(createCategorySchema)],
    handler: categoriesController.create.bind(categoriesController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: categoriesController.showEditForm.bind(categoriesController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateCategorySchema)],
    handler: categoriesController.update.bind(categoriesController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: categoriesController.delete.bind(categoriesController),
  });

  fastify.get('/check-slug', {
    preHandler: [auth, validateQuery(slugQuerySchema)],
    handler: categoriesController.checkSlug.bind(categoriesController),
  });
}
