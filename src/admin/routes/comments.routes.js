// src/admin/routes/comments.routes.js
// Comments routes - nested under posts

import { commentsController } from '../controllers/comments.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { replyCommentSchema, updateCommentSchema } from '../schemas/comment.schema.js';
import { commentParamsSchema, commentsListQuerySchema, postIdParamSchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function commentsRoutes(fastify, opts) {
  fastify.addHook('preHandler', auth);

  fastify.get('/', {
    preHandler: [validateParams(postIdParamSchema), validateQuery(commentsListQuerySchema)],
    handler: commentsController.showComments.bind(commentsController),
  });

  fastify.post('/reply', {
    preHandler: [validateParams(postIdParamSchema), validateBody(replyCommentSchema)],
    handler: commentsController.replyToComment.bind(commentsController),
  });

  fastify.put('/:id', {
    preHandler: [validateParams(commentParamsSchema), validateBody(updateCommentSchema)],
    handler: commentsController.updateComment.bind(commentsController),
  });

  fastify.delete('/:id', {
    preHandler: validateParams(commentParamsSchema),
    handler: commentsController.deleteComment.bind(commentsController),
  });
}
