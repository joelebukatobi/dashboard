// src/admin/controllers/api/posts.controller.js
// Public API controller for posts - serves JSON for frontend consumption

import crypto from 'crypto';
import { postsService } from '../../../services/posts.service.js';
import { postLikesService } from '../../../services/post-likes.service.js';
import { getPublicPageLimit } from '../../../lib/site-pagination.js';
import { db, posts, categories, users, tags, postTags } from '../../../db/index.js';
import { eq, and, desc, asc, sql, count, inArray } from 'drizzle-orm';

/**
 * Format post for API response (matches existing website structure)
 * @param {Object} post - Raw post data
 * @returns {Object} - Formatted post object
 */
function formatPostForAPI(post, { likedByViewer = false } = {}) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.excerpt || '',
    post: post.content,
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
      const offset = (pageNum - 1) * limitNum;

      // Build conditions
      const conditions = [eq(posts.status, 'PUBLISHED')];

      // Filter by category slug if provided
      if (category) {
        const categoryData = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, category))
          .limit(1);
        
        if (categoryData.length > 0) {
          conditions.push(eq(posts.categoryId, categoryData[0].id));
        }
      }

      // Get total count
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(...conditions));

      // Get posts with relations
      let postsQuery = db
        .select({
          post: posts,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          category: {
            id: categories.id,
            title: categories.title,
            slug: categories.slug,
            description: categories.description,
            createdAt: categories.createdAt,
            updatedAt: categories.updatedAt,
          },
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(posts.publishedAt))
        .limit(limitNum)
        .offset(offset);

      const results = await postsQuery;

      // Get tags for each post (skip if no posts)
      const postIds = results.map(r => r.post.id);
      const tagsByPost = {};
      
      if (postIds.length > 0) {
        const tagsData = await db
          .select({
            postId: postTags.postId,
            tag: {
              id: tags.id,
              name: tags.name,
              slug: tags.slug,
              createdAt: tags.createdAt,
              updatedAt: tags.updatedAt,
            },
          })
          .from(postTags)
          .innerJoin(tags, eq(postTags.tagId, tags.id))
          .where(inArray(postTags.postId, postIds));

        // Group tags by post
        tagsData.forEach(({ postId, tag }) => {
          if (!tagsByPost[postId]) tagsByPost[postId] = [];
          tagsByPost[postId].push(tag);
        });
      }

      // Format posts
      const postsWithImages = await postsService.attachFeaturedImageUrls(
        results.map(r => ({
          ...r.post,
          author: r.author,
          category: r.category,
          tags: tagsByPost[r.post.id] || [],
        })),
      );
      const formattedPosts = postsWithImages.map(formatPostForAPI);

      // Filter by tag if provided (do this after fetching)
      let filteredPosts = formattedPosts;
      if (tag) {
        filteredPosts = formattedPosts.filter(post => 
          post.tags.some(t => t.slug === tag)
        );
      }

      return reply.send({
        data: filteredPosts,
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

      // Get post with relations
      const result = await db
        .select({
          post: posts,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          category: {
            id: categories.id,
            title: categories.title,
            slug: categories.slug,
            description: categories.description,
            createdAt: categories.createdAt,
            updatedAt: categories.updatedAt,
          },
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .where(and(
          eq(posts.slug, slug),
          eq(posts.status, 'PUBLISHED')
        ))
        .limit(1);

      if (result.length === 0) {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: `Post with slug '${slug}' not found`,
        });
      }

      const { post, author, category } = result[0];

      // Get tags
      const tagsData = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
        })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(eq(postTags.postId, post.id));

      const postWithRelations = await postsService.attachFeaturedImageUrls({
        ...post,
        author,
        category,
        tags: tagsData,
      });

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
