// src/admin/routes/subscribers.routes.js
// Subscribers routes

import { subscribersController } from '../controllers/subscribers.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createSubscriberSchema, updateSubscriberSchema } from '../schemas/subscriber.schema.js';
import { resourceIdSchema, subscribersListQuerySchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function subscribersRoutes(fastify, opts) {
  fastify.addHook('preHandler', auth);

  fastify.get('/', {
    preHandler: validateQuery(subscribersListQuerySchema),
    handler: subscribersController.list.bind(subscribersController),
  });

  fastify.get('/new', {
    handler: subscribersController.new.bind(subscribersController),
  });

  fastify.post('/', {
    preHandler: validateBody(createSubscriberSchema),
    handler: subscribersController.create.bind(subscribersController),
  });

  fastify.get('/:id/edit', {
    preHandler: validateParams(resourceIdSchema),
    handler: subscribersController.edit.bind(subscribersController),
  });

  fastify.put('/:id', {
    preHandler: [validateParams(resourceIdSchema), validateBody(updateSubscriberSchema)],
    handler: subscribersController.update.bind(subscribersController),
  });

  fastify.delete('/:id', {
    preHandler: validateParams(resourceIdSchema),
    handler: subscribersController.delete.bind(subscribersController),
  });
}
