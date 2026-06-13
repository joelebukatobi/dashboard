import { postsController } from '../controllers/posts.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { postBodySchema, updatePostSchema } from '../schemas/post.schema.js';
import { listQuerySchema, postsListQuerySchema, resourceIdSchema, slugQuerySchema } from '../schemas/common.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function postsRoutes(fastify) {
  fastify.get('/', {
    preHandler: [auth, validateQuery(postsListQuerySchema)],
    handler: postsController.listPosts.bind(postsController),
  });

  fastify.get('/new', {
    preHandler: auth,
    handler: postsController.showNewPostForm.bind(postsController),
  });

  fastify.post('/', {
    preHandler: [auth, validateBody(postBodySchema)],
    handler: postsController.createPost.bind(postsController),
  });

  fastify.get('/:id/edit', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: postsController.showEditPostForm.bind(postsController),
  });

  fastify.put('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema), validateBody(updatePostSchema)],
    handler: postsController.updatePost.bind(postsController),
  });

  fastify.delete('/:id', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: postsController.deletePost.bind(postsController),
  });

  fastify.post('/:id/publish', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: postsController.publishPost.bind(postsController),
  });

  fastify.post('/:id/unpublish', {
    preHandler: [auth, validateParams(resourceIdSchema)],
    handler: postsController.unpublishPost.bind(postsController),
  });

  fastify.get('/check-slug', {
    preHandler: [auth, validateQuery(slugQuerySchema)],
    handler: postsController.checkSlug.bind(postsController),
  });

  fastify.post('/upload-image', {
    preHandler: auth,
    handler: postsController.uploadImage.bind(postsController),
  });

  fastify.post('/upload-video', {
    preHandler: auth,
    handler: postsController.uploadVideo.bind(postsController),
  });

  fastify.get('/media/images', {
    preHandler: auth,
    handler: postsController.listEditorImages.bind(postsController),
  });

  fastify.get('/media/videos', {
    preHandler: auth,
    handler: postsController.listEditorVideos.bind(postsController),
  });

  fastify.post('/:id/view', {
    preHandler: validateParams(resourceIdSchema),
    handler: postsController.incrementViewCount.bind(postsController),
  });
}
