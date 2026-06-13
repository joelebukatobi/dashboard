// src/admin/routes/users.routes.js
// User routes

import { usersController } from '../controllers/users.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import { listQuerySchema, resourceIdSchema, usersListQuerySchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function userRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(usersListQuerySchema)],
    handler: usersController.list.bind(usersController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: usersController.showNewForm.bind(usersController),
  });

  fastify.post('/', {
    preHandler: [auth, validateBody(createUserSchema)],
    handler: usersController.create.bind(usersController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.showEditForm.bind(usersController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateUserSchema)],
    handler: usersController.update.bind(usersController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.delete.bind(usersController),
  });

  fastify.post('/:id/suspend', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.suspend.bind(usersController),
  });

  fastify.post('/:id/activate', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.activate.bind(usersController),
  });

  fastify.post('/:id/resend-invite', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.resendInvite.bind(usersController),
  });

  fastify.post('/:id/avatar', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: usersController.uploadAvatar.bind(usersController),
  });
}
