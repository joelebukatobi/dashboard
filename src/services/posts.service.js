// src/services/posts.service.js
import { db, posts, categories, tags, postTags, users, mediaItems, comments } from '../db/index.js';
import { eq, and, desc, asc, like, sql, gte, lt } from 'drizzle-orm';
import { activityService } from './activity.service.js';
import { commentsService } from './comments.service.js';
import crypto from 'crypto';

/**
 * Posts Service
 * Handles all post-related database operations
 * Following Single Responsibility Principle
 */
class PostsService {
  /**
   * Get all posts with filters and pagination
   * @param {Object} options - Query options
   * @param {string} [options.status] - Filter by status (DRAFT, PUBLISHED, ARCHIVED, SCHEDULED)
   * @param {string} [options.categoryId] - Filter by category
   * @param {string} [options.search] - Search in title
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Posts per page
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order (asc, desc)
   * @returns {Promise<Object>} - { posts, total, page, totalPages }
   */
  async getAllPosts(options = {}) {
    const {
      status,
      categoryId,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build where conditions
    const whereConditions = [];
    
    if (status) {
      whereConditions.push(eq(posts.status, status));
    }
    
    if (categoryId) {
      whereConditions.push(eq(posts.categoryId, categoryId));
    }
    
    if (search) {
      whereConditions.push(like(posts.title, `%${search}%`));
    }

    // Get total count
    const countQuery = db.select({ count: sql`count(*)` }).from(posts);
    if (whereConditions.length > 0) {
      countQuery.where(and(...whereConditions));
    }
    const [{ count: totalCount }] = await countQuery;
    const total = Number(totalCount);

    // Get posts with relations
    let query = db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        category: {
          id: categories.id,
          title: categories.title,
          slug: categories.slug,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Sorting
    const sortColumn = posts[sortBy] || posts.createdAt;
    query = sortOrder === 'asc' 
      ? query.orderBy(asc(sortColumn))
      : query.orderBy(desc(sortColumn));

    // Pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const results = await query;

    // Get comment counts for these posts
    const postIds = results.map(r => r.post.id);
    const commentCounts = await commentsService.getCommentCountsForPosts(postIds);

    // Format results
    const formattedPosts = results.map(r => ({
      ...r.post,
      author: r.author,
      category: r.category,
      commentsCount: commentCounts[r.post.id] || 0,
    }));

    return {
      posts: formattedPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get post by ID with full details
   * @param {string} id - Post UUID
   * @returns {Promise<Object|null>} - Post with relations or null
   */
  async getPostById(id) {
    const result = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        category: {
          id: categories.id,
          title: categories.title,
          slug: categories.slug,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (!result[0]) return null;

    // Get tags for this post
    const tagsResult = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, id));

    return {
      ...result[0].post,
      author: result[0].author,
      category: result[0].category,
      tags: tagsResult,
    };
  }

  /**
   * Get post by slug
   * @param {string} slug - Post slug
   * @returns {Promise<Object|null>} - Post or null
   */
  async getPostBySlug(slug) {
    const result = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new post
   * @param {Object} data - Post data
   * @param {string} userId - Author user ID
   * @returns {Promise<Object>} - Created post
   */
  async createPost(data, userId) {
    const {
      title,
      slug,
      content,
      excerpt,
      categoryId,
      tagIds = [],
      status = 'DRAFT',
      metaTitle,
      metaDescription,
      featuredImageId,
    } = data;

    // Check for duplicate slug
    const existing = await this.getPostBySlug(slug);
    if (existing) {
      throw new Error('A post with this slug already exists');
    }

    // Create post
    const postId = crypto.randomUUID();

    await db
      .insert(posts)
      .values({
        id: postId,
        title,
        slug,
        content,
        excerpt,
        categoryId,
        authorId: userId,
        status,
        metaTitle,
        metaDescription,
        featuredImageId,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      });

    // Add tags if provided
    if (tagIds.length > 0) {
      await this.updatePostTags(postId, tagIds);
    }

    // Increment category post count
    if (status === 'PUBLISHED') {
      await this.incrementCategoryPostCount(categoryId);
    }

    // Get full post data for logging
    const fullPost = await this.getPostById(postId);

    // Log activity
    await activityService.logPostCreated(userId, fullPost);

    // Log publication separately if published
    if (status === 'PUBLISHED') {
      await activityService.logPostPublished(userId, fullPost);
    }

    return fullPost;
  }

  /**
   * Update existing post
   * @param {string} id - Post ID
   * @param {Object} data - Post data
   * @returns {Promise<Object>} - Updated post
   */
  async updatePost(id, data) {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    const {
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
    } = data;

    // Check for slug conflict if changed
    if (slug && slug !== post.slug) {
      const existing = await this.getPostBySlug(slug);
      if (existing && existing.id !== id) {
        throw new Error('A post with this slug already exists');
      }
    }

    // Determine if publishing for first time
    const wasPublished = post.status === 'PUBLISHED';
    const isPublishing = status === 'PUBLISHED' && !wasPublished;

    // Update post
    await db
      .update(posts)
      .set({
        title: title || post.title,
        slug: slug || post.slug,
        content: content || post.content,
        excerpt: excerpt !== undefined ? excerpt : post.excerpt,
        categoryId: categoryId || post.categoryId,
        status: status || post.status,
        metaTitle: metaTitle !== undefined ? metaTitle : post.metaTitle,
        metaDescription: metaDescription !== undefined ? metaDescription : post.metaDescription,
        featuredImageId: featuredImageId !== undefined ? featuredImageId : post.featuredImageId,
        publishedAt: isPublishing ? new Date() : post.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    // Update tags if provided
    if (tagIds !== undefined) {
      await this.updatePostTags(id, tagIds);
    }

    // Track changes for activity log
    const changes = {};
    if (title && title !== post.title) changes.title = { from: post.title, to: title };
    if (slug && slug !== post.slug) changes.slug = { from: post.slug, to: slug };
    if (status && status !== post.status) changes.status = { from: post.status, to: status };
    if (categoryId && categoryId !== post.categoryId) changes.categoryId = { from: post.categoryId, to: categoryId };

    // Update category counts if status changed
    if (status && status !== post.status) {
      if (status === 'PUBLISHED') {
        await this.incrementCategoryPostCount(categoryId || post.categoryId);
        if (post.categoryId !== categoryId) {
          await this.decrementCategoryPostCount(post.categoryId);
        }
      } else if (post.status === 'PUBLISHED') {
        await this.decrementCategoryPostCount(post.categoryId);
      }
    }

    // Handle category change when status stays PUBLISHED
    if (post.status === 'PUBLISHED' && categoryId !== undefined && categoryId !== post.categoryId) {
      await this.decrementCategoryPostCount(post.categoryId);
      await this.incrementCategoryPostCount(categoryId);
    }

    // Get updated post
    const updatedPost = await this.getPostById(id);

    // Log activity
    if (Object.keys(changes).length > 0) {
      await activityService.logPostUpdated(userId || post.authorId, updatedPost, changes);
    }

    // Log if post was published for first time
    if (isPublishing) {
      await activityService.logPostPublished(userId || post.authorId, updatedPost);
    }

    return updatedPost;
  }

  /**
   * Delete post
   * @param {string} id - Post ID
   * @param {string} [userId] - User performing the deletion
   * @returns {Promise<boolean>} - Success status
   */
  async deletePost(id, userId) {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    // Get current tags before deletion to decrement counts
    const currentTags = await db
      .select({ tagId: postTags.tagId })
      .from(postTags)
      .where(eq(postTags.postId, id));

    // Log activity BEFORE deletion
    await activityService.logPostDeleted(userId || post.authorId, post);

    // Delete post tags first
    await db.delete(postTags).where(eq(postTags.postId, id));

    // Delete post
    await db.delete(posts).where(eq(posts.id, id));

    // Decrement category count if was published
    if (post.status === 'PUBLISHED') {
      await this.decrementCategoryPostCount(post.categoryId);
    }

    // Decrement tag counts
    for (const { tagId } of currentTags) {
      await this.decrementTagPostCount(tagId);
    }

    return true;
  }

  /**
   * Update post tags
   * @param {string} postId - Post ID
   * @param {Array<string>} tagIds - Tag IDs
   * @param {boolean} [shouldUpdateCounts=true] - Whether to update tag post counts
   */
  async updatePostTags(postId, tagIds, shouldUpdateCounts = true) {
    // Get current tags to calculate differences
    let currentTagIds = [];
    if (shouldUpdateCounts) {
      const currentTags = await db
        .select({ tagId: postTags.tagId })
        .from(postTags)
        .where(eq(postTags.postId, postId));
      currentTagIds = currentTags.map(t => t.tagId);
    }

    // Remove existing tags
    await db.delete(postTags).where(eq(postTags.postId, postId));

    // Decrement count for removed tags
    if (shouldUpdateCounts) {
      const removedTags = currentTagIds.filter(id => !tagIds.includes(id));
      for (const tagId of removedTags) {
        await this.decrementTagPostCount(tagId);
      }
    }

    // Add new tags
    if (tagIds.length > 0) {
      const tagValues = tagIds.map(tagId => ({
        postId,
        tagId,
      }));
      await db.insert(postTags).values(tagValues);

      // Increment count for new tags
      if (shouldUpdateCounts) {
        const addedTags = tagIds.filter(id => !currentTagIds.includes(id));
        for (const tagId of addedTags) {
          await this.incrementTagPostCount(tagId);
        }
      }
    }
  }

  /**
   * Increment category post count
   * @param {string} categoryId - Category ID
   */
  async incrementCategoryPostCount(categoryId) {
    if (!categoryId) return;
    
    await db
      .update(categories)
      .set({
        postCount: sql`${categories.postCount} + 1`,
      })
      .where(eq(categories.id, categoryId));
  }

  /**
   * Decrement category post count
   * @param {string} categoryId - Category ID
   */
  async decrementCategoryPostCount(categoryId) {
    if (!categoryId) return;
    
    await db
      .update(categories)
      .set({
        postCount: sql`${categories.postCount} - 1`,
      })
      .where(eq(categories.id, categoryId));
  }

  /**
   * Increment tag post count
   * @param {string} tagId - Tag ID
   */
  async incrementTagPostCount(tagId) {
    if (!tagId) return;
    
    await db
      .update(tags)
      .set({
        postCount: sql`${tags.postCount} + 1`,
      })
      .where(eq(tags.id, tagId));
  }

  /**
   * Decrement tag post count
   * @param {string} tagId - Tag ID
   */
  async decrementTagPostCount(tagId) {
    if (!tagId) return;
    
    await db
      .update(tags)
      .set({
        postCount: sql`GREATEST(${tags.postCount} - 1, 0)`,
      })
      .where(eq(tags.id, tagId));
  }

  /**
   * Get recent posts
   * @param {number} [limit=5] - Number of posts
   * @returns {Promise<Array>} - Recent posts
   */
  async getRecentPosts(limit = 5) {
    const results = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.status, 'PUBLISHED'))
      .orderBy(desc(posts.publishedAt))
      .limit(limit);

    return results.map(r => ({
      ...r.post,
      author: r.author,
    }));
  }

  /**
   * Get posts count with date filtering
   * @param {Object} options - Filter options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {string} [options.status] - Post status filter
   * @returns {Promise<number>} - Count of posts
   */
  async getPostsCountByDate({ startDate, endDate, status }) {
    let query = db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(
        and(
          gte(posts.createdAt, startDate),
          lt(posts.createdAt, endDate)
        )
      );

    if (status) {
      query = query.where(eq(posts.status, status));
    }

    const [result] = await query;
    return Number(result.count);
  }

  /**
   * Get posts growth percentage (current period vs previous period)
   * @param {number} [days=30] - Number of days per period
   * @returns {Promise<Object>} - Growth data
   */
  async getPostsGrowth(days = 30) {
    const now = new Date();
    
    // Current period
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const currentCount = await this.getPostsCountByDate({
      startDate: currentStart,
      endDate: now,
      status: 'PUBLISHED'
    });

    // Previous period
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
    const previousCount = await this.getPostsCountByDate({
      startDate: previousStart,
      endDate: currentStart,
      status: 'PUBLISHED'
    });

    let trend;
    if (previousCount > 0) {
      trend = ((currentCount - previousCount) / previousCount) * 100;
    } else if (currentCount > 0) {
      // If previous was 0 but we have current, it's 100% growth (or more)
      trend = 100;
    } else {
      trend = 0;
    }

    return {
      current: currentCount,
      previous: previousCount,
      trend: Math.round(trend * 10) / 10 // Round to 1 decimal
    };
  }

  /**
   * Get top posts by view count
   * @param {number} [limit=5] - Number of posts
   * @returns {Promise<Array>} - Top posts
   */
  async getTopPosts(limit = 5) {
    const results = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        category: {
          id: categories.id,
          title: categories.title,
          slug: categories.slug,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.status, 'PUBLISHED'))
      .orderBy(desc(posts.viewCount))
      .limit(limit);

    return results.map(r => ({
      ...r.post,
      author: r.author,
      category: r.category,
    }));
  }

  /**
   * Get posts count
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<number>} - Total count
   */
  async getPostsCount(filters = {}) {
    const { status } = filters;
    
    let query = db.select({ count: sql`count(*)` }).from(posts);
    
    if (status) {
      query = query.where(eq(posts.status, status));
    }
    
    const [{ count }] = await query;
    return Number(count);
  }

  /**
   * Increment post view count
   * @param {string} id - Post ID
   * @returns {Promise<boolean>} - Success status
   */
  async incrementViewCount(id) {
    await db
      .update(posts)
      .set({
        viewCount: sql`${posts.viewCount} + 1`,
      })
      .where(eq(posts.id, id));
    
    return true;
  }

  /**
   * Get total views across all posts
   * @returns {Promise<number>} - Total view count
   */
  async getTotalViews() {
    const result = await db
      .select({
        total: sql`COALESCE(SUM(${posts.viewCount}), 0)`,
      })
      .from(posts);
    
    return result[0]?.total || 0;
  }
}

// Export singleton
export const postsService = new PostsService();
export default postsService;
