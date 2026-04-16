// src/admin/controllers/api/posts.controller.js
// Public API controller for posts - serves JSON for frontend consumption

import { postsService } from '../../../services/posts.service.js';
import { db, posts, categories, users, tags, postTags } from '../../../db/index.js';
import { eq, and, desc, asc, sql, count, inArray } from 'drizzle-orm';

/**
 * Format post for API response (matches existing website structure)
 * @param {Object} post - Raw post data
 * @returns {Object} - Formatted post object
 */
function formatPostForAPI(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.excerpt || '',
    post: post.content,
    image: post.featuredImageUrl || null,
    views: post.viewCount || 0,
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
      const { page = 1, limit = 10, category, tag } = request.query;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
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
      const formattedPosts = results.map(r => ({
        ...r.post,
        author: r.author,
        category: r.category,
        tags: tagsByPost[r.post.id] || [],
      })).map(formatPostForAPI);

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

      const postWithRelations = {
        ...post,
        author,
        category,
        tags: tagsData,
      };

      // Increment view count
      await postsService.incrementViewCount(post.id);

      return reply.send(formatPostForAPI(postWithRelations));
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
}

// Export singleton
export const postsAPIController = new PostsAPIController();
export default postsAPIController;
