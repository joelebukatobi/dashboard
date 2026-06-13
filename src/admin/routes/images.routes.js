// src/admin/routes/images.routes.js
// Images routes - admin media library

import { imagesController } from '../controllers/images.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';

/**
 * Register image routes
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Route options
 */
export default async function imagesRoutes(fastify, opts) {
  // GET /admin/media/images - List all images
  fastify.get('/', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.list.bind(imagesController),
  });

  // GET /admin/media/images/new - Show new image form
  fastify.get('/new', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.showNewForm.bind(imagesController),
  });

  // POST /admin/media/images - Upload image
  fastify.post('/', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.upload.bind(imagesController),
  });

  // GET /admin/media/images/batch - Show batch upload form
  fastify.get('/batch', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.showBatchForm.bind(imagesController),
  });

  // POST /admin/media/images/batch - Batch upload images
  fastify.post('/batch', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.batchUpload.bind(imagesController),
  });

  // GET /admin/media/images/:id/edit - Show edit form
  fastify.get('/:id/edit', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.showEditForm.bind(imagesController),
  });

  // PUT /admin/media/images/:id - Update image
  fastify.put('/:id', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.update.bind(imagesController),
  });

  // DELETE /admin/media/images/:id - Delete image
  fastify.delete('/:id', {
    preHandler: requireAuthRedirect('/admin/auth/login'),
    handler: imagesController.delete.bind(imagesController),
  });
}
