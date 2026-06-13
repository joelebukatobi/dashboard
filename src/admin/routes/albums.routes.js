// src/admin/routes/albums.routes.js
// Albums routes - admin album management

import { albumsController } from '../controllers/albums.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createAlbumSchema, updateAlbumSchema } from '../schemas/album.schema.js';
import { listQuerySchema, resourceIdSchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function albumsRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(listQuerySchema)],
    handler: albumsController.list.bind(albumsController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: albumsController.showNewForm.bind(albumsController),
  });

  fastify.post('/', {
    preHandler: [auth, validateBody(createAlbumSchema)],
    handler: albumsController.create.bind(albumsController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: albumsController.showEditForm.bind(albumsController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updateAlbumSchema)],
    handler: albumsController.update.bind(albumsController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: albumsController.delete.bind(albumsController),
  });
}
