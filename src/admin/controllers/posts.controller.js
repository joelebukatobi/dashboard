// src/admin/controllers/posts.controller.js
import { postsService } from '../../services/posts.service.js';
import { db, categories, tags } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { imagesService } from '../../services/images.service.js';
import { videosService } from '../../services/videos.service.js';
import { toPublicMediaUrl } from '../../lib/media-paths.js';
import crypto from 'crypto';
import { parsePostTagIds } from '../../lib/post-input.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';

/**
 * Posts Controller
 * Handles post-related HTTP requests
 */
class PostsController {
  /**
   * GET /admin/posts
   * Display posts list page
   */
  async listPosts(request, reply) {
    try {
      const { 
        page = 1, 
        status, 
        category: categoryId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        toast,
      } = request.query;

      // Get posts with pagination
      const { posts, total, totalPages } = await postsService.getAllPosts({
        page: parseInt(page),
        status,
        categoryId,
        search,
        sortBy,
        sortOrder,
        limit: 10,
      });

      // Get categories for filter dropdown
      const allCategories = await db.select().from(categories);

      // Get counts by status
      const totalPosts = await postsService.getPostsCount();
      const publishedCount = await postsService.getPostsCount({ status: 'PUBLISHED' });
      const draftCount = await postsService.getPostsCount({ status: 'DRAFT' });
      const scheduledCount = await postsService.getPostsCount({ status: 'SCHEDULED' });

      const data = {
        posts,
        total,
        page: parseInt(page),
        totalPages,
        categories: allCategories,
        statusCounts: {
          total: totalPosts,
          published: publishedCount,
          draft: draftCount,
          scheduled: scheduledCount,
        },
        filters: {
          status,
          categoryId,
          search,
          sortBy,
          sortOrder,
        },
        user: request.user,
        toast,
      };

      // Check if HTMX request - return only table fragment
      const isHtmx = request.headers['hx-request'] === 'true';

      const {
        postsListContent,
        postsListMeta,
        postsTableFragment,
      } = await import('../templates/pages/posts/index.js');

      if (isHtmx) {
        return renderFragment(reply, postsTableFragment(data));
      }

      return renderAdminPage(
        request,
        reply,
        postsListMeta({ user: request.user }),
        postsListContent(data),
      );

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load posts. Please try again.'
      }));
    }
  }

  /**
   * GET /admin/posts/new
   * Display new post form
   */
  async showNewPostForm(request, reply) {
    try {
      // Get categories and tags for form
      const allCategories = await db.select().from(categories);
      const allTags = await db.select().from(tags);

      const data = {
        categories: allCategories,
        tags: allTags,
        post: null,
        user: request.user,
      };

      const { postNewContent, postNewMeta } = await import('../templates/pages/posts/index.js');

      return renderAdminPage(
        request,
        reply,
        postNewMeta(),
        postNewContent(data),
      );

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load post form. Please try again.'
      }));
    }
  }

  /**
   * POST /admin/posts
   * Create new post
   */
  async createPost(request, reply) {
    try {
      const {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tags: tagIdsString,
        status = 'DRAFT',
        metaTitle,
        metaDescription,
        featuredImageId,
      } = request.body;

      const tagIds = parsePostTagIds({ tags: tagIdsString });

      const post = await postsService.createPost({
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tagIds,
        status,
        metaTitle,
        metaDescription,
        featuredImageId,
      }, request.user.id);

      const toastKey = status === 'PUBLISHED' ? 'published' : 'draftSaved';
      const redirectUrl = `/admin/posts/${post.id}/edit?toast=${toastKey}`;

      if (request.headers['hx-request'] !== 'true') {
        return reply.redirect(redirectUrl);
      }

      return htmxRedirect(reply, redirectUrl);

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to create post. Please try again.'
      }));
    }
  }

  /**
   * GET /admin/posts/:id/edit
   * Display edit post form
   */
  async showEditPostForm(request, reply) {
    try {
      const { id } = request.params;
      
      const post = await postsService.getPostById(id);
      
      if (!post) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Post not found'
        }));
      }

      // Get categories and tags for form
      const allCategories = await db.select().from(categories);
      const allTags = await db.select().from(tags);

      const data = {
        categories: allCategories,
        tags: allTags,
        post,
        user: request.user,
        toast: request.query?.toast,
      };

      const { postEditContent, postEditMeta } = await import('../templates/pages/posts/index.js');

      return renderAdminPage(
        request,
        reply,
        postEditMeta({ post }),
        postEditContent(data),
      );

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load post. Please try again.'
      }));
    }
  }

  /**
   * PUT /admin/posts/:id
   * Update existing post
   */
  async updatePost(request, reply) {
    try {
      const { id } = request.params;
      const {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tags: tagIdsString,
        status,
        metaTitle,
        metaDescription,
        featuredImageId,
      } = request.body;

      const tagIds = parsePostTagIds({ tags: tagIdsString });

      // Update post
      const post = await postsService.updatePost(id, {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tagIds,
        status,
        metaTitle,
        metaDescription,
        featuredImageId,
      });

      return renderEmpty(setHtmxToast(reply, {
        message: status === 'PUBLISHED' ? 'Post updated and published!' : 'Draft updated successfully!',
      }));

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update post. Please try again.'
      }));
    }
  }

  /**
   * DELETE /admin/posts/:id
   * Delete post
   */
  async deletePost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.deletePost(id);

      // Full browser redirect with toast param (avoids isHtmx fragment response)
      return htmxRedirect(reply, '/admin/posts?toast=deleted');

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete post. Please try again.'
      }));
    }
  }

  /**
   * POST /admin/posts/:id/publish
   * Quick publish action
   */
  async publishPost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.updatePost(id, { status: 'PUBLISHED' });

      return renderFragment(setHtmxToast(reply, { message: 'Post published successfully!' }), successAlert({
        message: 'Post published successfully!'
      }));

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to publish post.'
      }));
    }
  }

  /**
   * POST /admin/posts/:id/unpublish
   * Quick unpublish action
   */
  async unpublishPost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.updatePost(id, { status: 'DRAFT' });

      return renderFragment(setHtmxToast(reply, { message: 'Post moved to drafts' }), successAlert({
        message: 'Post moved to drafts'
      }));

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to unpublish post.'
      }));
    }
  }

  /**
   * POST /admin/posts/upload-image
   * Upload featured image with hash-based deduplication
   */
  async uploadImage(request, reply) {
    try {
      const file = await request.file();

      if (!file) {
        reply.code(400);
        return reply.send({ error: 'No image file provided' });
      }

      const { mediaItem, deduplicated, url } = await imagesService.uploadForPost(
        file,
        request.user.id,
      );

      return reply.send({
        id: mediaItem.id,
        url,
        filename: mediaItem.filename,
        deduplicated,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(error.message?.includes('Invalid') || error.message?.includes('too large') ? 400 : 500);
      return reply.send({ error: error.message || 'Failed to upload image' });
    }
  }

  /**
   * POST /admin/posts/upload-video
   * Upload inline video for editor insertion
   */
  async uploadVideo(request, reply) {
    try {
      const file = await request.file();

      if (!file) {
        reply.code(400);
        return reply.send({ error: 'No video file provided' });
      }

      const video = await videosService.upload(
        file,
        {
          title: file.filename,
          altText: '',
          caption: '',
          description: '',
        },
        request.user.id,
      );

      return reply.send({
        id: video.id,
        url: toPublicMediaUrl(video.path),
        thumbnailUrl: toPublicMediaUrl(video.thumbnailPath),
        mimeType: video.mimeType,
        title: video.title,
        duration: video.duration,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.send({ error: error.message || 'Failed to upload video' });
    }
  }

  /**
   * GET /admin/posts/media/images
   * List images for editor media picker
   */
  async listEditorImages(request, reply) {
    try {
      const { search = '', page = 1, limit = 12 } = request.query;
      const result = await imagesService.getAll({
        search: search || undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      return reply.send({
        items: result.data.map((image) => ({
          id: image.id,
          url: toPublicMediaUrl(image.path),
          thumbnailUrl: toPublicMediaUrl(image.thumbnailPath || image.path),
          title: image.title || image.originalName || image.filename,
          altText: image.altText || '',
          mimeType: image.mimeType,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch images' });
    }
  }

  /**
   * GET /admin/posts/media/videos
   * List videos for editor media picker
   */
  async listEditorVideos(request, reply) {
    try {
      const { search = '', page = 1, limit = 12 } = request.query;
      const result = await videosService.getAll({
        search: search || undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      return reply.send({
        items: result.data.map((video) => ({
          id: video.id,
          url: toPublicMediaUrl(video.path),
          thumbnailUrl: toPublicMediaUrl(video.thumbnailPath),
          title: video.title || video.originalName || video.filename,
          mimeType: video.mimeType,
          duration: video.duration || 0,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch videos' });
    }
  }

  /**
   * GET /admin/posts/check-slug
   * Check if slug is available
   */
  async checkSlug(request, reply) {
    try {
      const { slug, excludeId } = request.query;
      
      if (!slug) {
        return reply.send({ available: false });
      }

      const existing = await postsService.getPostBySlug(slug);
      
      const available = !existing || existing.id === excludeId;
      
      return reply.send({ available });

    } catch (error) {
      request.log.error(error);
      return reply.send({ available: false });
    }
  }

  /**
   * POST /admin/posts/:id/view
   * Increment post view count
   * Public endpoint for blog tracking
   */
  async incrementViewCount(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.incrementViewCount(id);
      
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to track view' });
    }
  }
}

// Export singleton
export const postsController = new PostsController();
export default postsController;
