// src/admin/controllers/api/categories.controller.js
// Public API controller for categories

import { db, categories, posts, users, tags, postTags } from '../../../db/index.js';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { postsService } from '../../../services/posts.service.js';

/**
 * Format category for API response
 * @param {Object} category - Raw category data
 * @returns {Object} - Formatted category object
 */
function formatCategoryForAPI(category) {
  return {
    id: category.id,
    name: category.title,
    slug: category.slug,
    description: category.description || '',
    status: '1',
    created_at: category.createdAt?.toISOString() || null,
    updated_at: category.updatedAt?.toISOString() || null,
  };
}

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
 * Categories API Controller
 * Handles public API requests for categories
 */
class CategoriesAPIController {
  /**
   * GET /api/v1/categories
   * List all categories with post counts
   */
  async list(request, reply) {
    try {
      // Get all categories with post count
      const results = await db
        .select({
          category: categories,
          postCount: count(posts.id),
        })
        .from(categories)
        .leftJoin(posts, and(
          eq(posts.categoryId, categories.id),
          eq(posts.status, 'PUBLISHED')
        ))
        .groupBy(categories.id)
        .orderBy(desc(count(posts.id)));

      const formattedCategories = results.map(r => ({
        ...formatCategoryForAPI(r.category),
        posts_count: Number(r.postCount),
      }));

      return reply.send({
        data: formattedCategories,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch categories',
      });
    }
  }

  /**
   * GET /api/v1/categories/:slug/posts
   * Get posts in a category
   */
  async getPostsByCategory(request, reply) {
    try {
      const { slug } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Get category
      const categoryData = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (categoryData.length === 0) {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: `Category with slug '${slug}' not found`,
        });
      }

      const category = categoryData[0];

      // Get total count
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(
          eq(posts.categoryId, category.id),
          eq(posts.status, 'PUBLISHED')
        ));

      // Get posts
      const results = await db
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
          eq(posts.categoryId, category.id),
          eq(posts.status, 'PUBLISHED')
        ))
        .orderBy(desc(posts.publishedAt))
        .limit(limitNum)
        .offset(offset);

      // Get tags for posts
      const postIds = results.map(r => r.post.id);
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
        .where(sql`${postTags.postId} IN (${postIds.join(',')})`);

      // Group tags by post
      const tagsByPost = {};
      tagsData.forEach(({ postId, tag }) => {
        if (!tagsByPost[postId]) tagsByPost[postId] = [];
        tagsByPost[postId].push(tag);
      });

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

      return reply.send({
        category: formatCategoryForAPI(category),
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
        message: 'Failed to fetch category posts',
      });
    }
  }
}

// Export singleton
export const categoriesAPIController = new CategoriesAPIController();
export default categoriesAPIController;
