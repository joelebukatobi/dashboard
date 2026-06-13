// src/admin/routes/api/comments.routes.js
// Public API routes for comments

import { commentsAPIController } from '../../controllers/api/comments.controller.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { publicCommentSchema } from '../../schemas/api.schema.js';
import { apiCommentsQuerySchema, slugParamSchema } from '../../schemas/common.schema.js';

export default async function commentsAPIRoutes(fastify, opts) {
  fastify.get('/posts/:slug/comments', {
    preHandler: [validateParams(slugParamSchema), validateQuery(apiCommentsQuerySchema)],
    handler: commentsAPIController.getByPostSlug.bind(commentsAPIController),
  });

  fastify.post('/comments', {
    preHandler: validateBody(publicCommentSchema),
    handler: commentsAPIController.create.bind(commentsAPIController),
  });
}
