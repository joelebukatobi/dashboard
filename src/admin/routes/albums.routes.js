// src/admin/routes/albums.routes.js
// Albums routes - admin album management

import { albumsController } from '../controllers/albums.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';

export default async function albumsRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.list.bind(albumsController));

  fastify.get('/new', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.showNewForm.bind(albumsController));

  fastify.post('/', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.create.bind(albumsController));

  fastify.get('/:id/edit', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.showEditForm.bind(albumsController));

  fastify.put('/:id', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.update.bind(albumsController));

  fastify.delete('/:id', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
  }, albumsController.delete.bind(albumsController));
}
