import { homeController } from '../controllers/home.controller.js';
import { blogController } from '../controllers/blog.controller.js';
import { validateParams, validateQuery } from '../../admin/middleware/validate.js';
import { blogListQuerySchema, slugParamSchema } from '../../admin/schemas/common.schema.js';

export default async function publicRoutes(fastify) {
  fastify.get('/', homeController.index.bind(homeController));

  fastify.get('/blog', {
    preHandler: validateQuery(blogListQuerySchema),
    handler: blogController.index.bind(blogController),
  });

  fastify.get('/blog/:slug', {
    preHandler: validateParams(slugParamSchema),
    handler: blogController.show.bind(blogController),
  });
}
