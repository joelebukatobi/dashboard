// src/admin/controllers/api/tags.controller.js
// Public API controller for tags

import { db, tags, posts, users, categories, postTags } from '../../../db/index.js';
import { eq, and, desc, sql, count, inArray } from 'drizzle-orm';
import { postsService } from '../../../services/posts.service.js';

/**
 * Format tag for API response
 * @param {Object} tag - Raw tag data
 * @returns {Object} - Formatted tag object
 */
function formatTagForAPI(tag) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    status: '1',
    created_at: tag.createdAt?.toISOString() || null,
    updated_at: tag.updatedAt?.toISOString() || null,
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
 * Tags API Controller
 * Handles public API requests for tags
 */
class TagsAPIController {
  /**
   * GET /api/v1/tags
   * List all tags with post counts
   */
  async list(request, reply) {
    try {
      // Get all tags with post count
      const results = await db
        .select({
          tag: tags,
          postCount: count(postTags.postId),
        })
        .from(tags)
        .leftJoin(postTags, eq(postTags.tagId, tags.id))
        .leftJoin(posts, and(
          eq(posts.id, postTags.postId),
          eq(posts.status, 'PUBLISHED')
        ))
        .groupBy(tags.id)
        .orderBy(desc(count(postTags.postId)));

      const formattedTags = results.map(r => ({
        ...formatTagForAPI(r.tag),
        posts_count: Number(r.postCount),
      }));

      return reply.send({
        data: formattedTags,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch tags',
      });
    }
  }

  /**
   * GET /api/v1/tags/:slug/posts
   * Get posts with a specific tag
   */
  async getPostsByTag(request, reply) {
    try {
      const { slug } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Get tag
      const tagData = await db
        .select()
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);

      if (tagData.length === 0) {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: `Tag with slug '${slug}' not found`,
        });
      }

      const tag = tagData[0];

      // Get post IDs with this tag
      const postTagData = await db
        .select({ postId: postTags.postId })
        .from(postTags)
        .where(eq(postTags.tagId, tag.id));

      const postIds = postTagData.map(pt => pt.postId);

      if (postIds.length === 0) {
        return reply.send({
          tag: formatTagForAPI(tag),
          data: [],
          meta: {
            current_page: pageNum,
            per_page: limitNum,
            total: 0,
            last_page: 0,
          },
        });
      }

      // Get total count (only published)
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(
          inArray(posts.id, postIds),
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
          inArray(posts.id, postIds),
          eq(posts.status, 'PUBLISHED')
        ))
        .orderBy(desc(posts.publishedAt))
        .limit(limitNum)
        .offset(offset);

      // Get all tags for these posts
      const resultPostIds = results.map(r => r.post.id);
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
        .where(inArray(postTags.postId, resultPostIds));

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
        tag: formatTagForAPI(tag),
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
        message: 'Failed to fetch tag posts',
      });
    }
  }
}

// Export singleton
export const tagsAPIController = new TagsAPIController();
export default tagsAPIController;
