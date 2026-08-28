// src/admin/controllers/api/posts.controller.js
// Public API controller for posts - serves JSON for frontend consumption

import crypto from 'crypto';
import { postsService } from '../../../services/posts.service.js';
import { postLikesService } from '../../../services/post-likes.service.js';
import { getPublicPageLimit } from '../../../lib/site-pagination.js';
import { rewriteContentMediaUrls } from '../../../lib/media-paths.js';

/**
 * Format post for API response (matches existing website structure)
 * @param {Object} post - Raw post data
 * @returns {Object} - Formatted post object
 */
export function formatPostForAPI(post, { likedByViewer = false } = {}) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.excerpt || '',
    post: rewriteContentMediaUrls(post.content),
    image: post.featuredImageUrl || null,
    views: post.viewCount || 0,
    likes: post.likeCount || 0,
    liked_by_viewer: likedByViewer,
    created_at: post.createdAt?.toISOString() || null,
    updated_at: post.updatedAt?.toISOString() || null,
    category: post.category ? {
      id: post.category.id,
      name: post.category.title,
      slug: post.category.slug,
      description: post.category.description || '',
      status: '1',
      created_at: post.category.createdAt?.toISOString() || null,
      updated_at: post.category.updatedAt?.toISOString() || null,
    } : null,
    tags: post.tags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      status: '1',
      created_at: tag.createdAt?.toISOString() || null,
      updated_at: tag.updatedAt?.toISOString() || null,
    })) || [],
    user: post.author ? {
      id: post.author.id,
      first_name: post.author.firstName,
      last_name: post.author.lastName,
      image: post.author.avatarUrl || null,
      username: post.author.email?.split('@')[0] || '',
      email: post.author.email,
      email_verified_at: null,
      created_at: post.author.createdAt?.toISOString() || null,
      updated_at: post.author.updatedAt?.toISOString() || null,
    } : null,
  };
}

/**
 * Posts API Controller
 * Handles public API requests for posts
 */
class PostsAPIController {
  /**
   * GET /api/v1/posts
   * List all published posts with pagination
   */
  async list(request, reply) {
    try {
      const { page = 1, limit, category, tag } = request.query;
      const pageNum = parseInt(page, 10) || 1;
      const siteMap = request.siteSettingsMap ?? {};
      const limitNum = getPublicPageLimit(siteMap, limit);

      // Both filters are applied in the query, so the page and the count agree
      // and an unknown slug returns nothing rather than everything.
      const { posts: rows, total } = await postsService.getAllPosts({
        status: 'PUBLISHED',
        categorySlug: category,
        tagSlug: tag,
        page: pageNum,
        limit: limitNum,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      const formattedPosts = rows.map((row) => formatPostForAPI(row));

      return reply.send({
        data: formattedPosts,
        meta: {
          current_page: pageNum,
          per_page: limitNum,
          total: Number(total),
          last_page: Math.ceil(Number(total) / limitNum),
        },
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch posts',
      });
    }
  }

  /**
   * GET /api/v1/posts/:slug
   * Get single post by slug
   */
  async getBySlug(request, reply) {
    try {
      const { slug } = request.params;

      const postWithRelations = await postsService.getPostWithRelations({
        slug,
        status: 'PUBLISHED',
      });

      if (!postWithRelations) {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: `Post with slug '${slug}' not found`,
        });
      }

      const post = postWithRelations;

      // Increment view count
      await postsService.incrementViewCount(post.id);

      const visitorId = request.cookies.visitor_id;
      const likedByViewer = visitorId ? await postLikesService.hasLiked(post.id, visitorId) : false;

      return reply.send(formatPostForAPI(postWithRelations, { likedByViewer }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch post',
      });
    }
  }

  /**
   * POST /api/v1/posts/:slug/like
   * Toggle the requesting visitor's like on a post
   */
  async like(request, reply) {
    try {
      const { slug } = request.params;
      const post = await postsService.getPostBySlug(slug);

      if (!post || post.status !== 'PUBLISHED') {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: `Post with slug '${slug}' not found`,
        });
      }

      const visitorId = request.cookies.visitor_id || crypto.randomUUID();
      const { liked, likeCount } = await postLikesService.toggle(post.id, visitorId);

      // Lazy cookie: only ever set at the moment someone actually likes something,
      // never on a passive page load — keeps this tied to an opt-in interaction.
      if (liked && !request.cookies.visitor_id) {
        reply.setCookie('visitor_id', visitorId, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 365 * 24 * 60 * 60, // @fastify/cookie's maxAge is in seconds, not ms
        });
      }

      return reply.send({ liked, likeCount });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to update like',
      });
    }
  }
}

// Export singleton
export const postsAPIController = new PostsAPIController();
export default postsAPIController;
