// src/services/comments.service.js
// Comments service - handles all comment operations

import { db, comments, posts, users, activities } from '../db/index.js';
import { eq, and, isNull, desc, count, sql, gte, lt } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Comments Service
 * Handles all comment-related database operations
 */
class CommentsService {
  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} content - Raw content
   * @returns {string} - Sanitized content
   */
  sanitizeContent(content) {
    if (!content) return '';
    
    // Remove script tags and event handlers
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  /**
   * Get paginated comments for a post (root level only)
   * @param {string} postId - Post ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Comments and pagination info
   */
  async getCommentsByPostId(postId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Get root comments (no parent) with pagination
    const rootComments = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        content: comments.content,
        status: comments.status,
        isEdited: comments.isEdited,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(and(
        eq(comments.postId, postId),
        isNull(comments.parentId)
      ))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count of root comments
    const [{ total }] = await db
      .select({ total: count() })
      .from(comments)
      .where(and(
        eq(comments.postId, postId),
        isNull(comments.parentId)
      ));

    // Build nested tree structure for each root comment
    const commentsWithReplies = await Promise.all(
      rootComments.map(comment => this.buildCommentTree(comment))
    );

    return {
      comments: commentsWithReplies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Build nested comment tree recursively
   * @param {Object} comment - Comment object
   * @returns {Promise<Object>} - Comment with nested replies
   */
  async buildCommentTree(comment, depth = 0) {
    // Get all replies for this comment
    const replies = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        content: comments.content,
        status: comments.status,
        isEdited: comments.isEdited,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(eq(comments.parentId, comment.id))
      .orderBy(desc(comments.createdAt));

    // Recursively build tree for each reply
    const nestedReplies = await Promise.all(
      replies.map(reply => this.buildCommentTree(reply, depth + 1))
    );

    return {
      ...comment,
      replies: nestedReplies,
      depth,
    };
  }

  /**
   * Get comment count for a post
   * @param {string} postId - Post ID
   * @returns {Promise<number>} - Comment count
   */
  async getCommentCount(postId) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(comments)
      .where(eq(comments.postId, postId));

    return total;
  }

  /**
   * Get comment counts for multiple posts
   * @param {Array<string>} postIds - Array of post IDs
   * @returns {Promise<Object>} - Map of postId -> count
   */
  async getCommentCountsForPosts(postIds) {
    if (!postIds || postIds.length === 0) return {};

    const results = await db
      .select({
        postId: comments.postId,
        count: count(),
      })
      .from(comments)
      .where(sql`${comments.postId} IN ${postIds}`)
      .groupBy(comments.postId);

    return results.reduce((acc, row) => {
      acc[row.postId] = row.count;
      return acc;
    }, {});
  }

  /**
   * Get a single comment by ID
   * @param {string} id - Comment ID
   * @returns {Promise<Object|null>} - Comment or null
   */
  async getCommentById(id) {
    const [comment] = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        content: comments.content,
        status: comments.status,
        isEdited: comments.isEdited,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(eq(comments.id, id));

    return comment || null;
  }

  /**
   * Create a new comment
   * @param {Object} data - Comment data
   * @returns {Promise<Object>} - Created comment
   */
  async createComment(data) {
    const sanitizedContent = this.sanitizeContent(data.content);
    const commentId = crypto.randomUUID();
    
    await db
      .insert(comments)
      .values({
        id: commentId,
        postId: data.postId,
        parentId: data.parentId || null,
        authorName: data.authorName || 'Anonymous',
        authorEmail: data.authorEmail || null,
        content: sanitizedContent,
        status: 'APPROVED', // Auto-approved
      });

    const comment = await this.getCommentById(commentId);

    // Log COMMENT_CREATED activity
    try {
      const post = await db.select({ title: posts.title }).from(posts).where(eq(posts.id, data.postId)).limit(1);
      const postTitle = post[0]?.title || 'Unknown Post';
      
      await db.insert(activities).values({
        type: 'COMMENT_CREATED',
        description: `${data.authorName || 'Anonymous'} commented on "${postTitle}"`,
        userId: null,
        entityId: data.postId,
        entityType: 'POST',
        createdAt: new Date(),
      });
    } catch (error) {
      // Don't fail if activity logging fails
      console.error('Failed to log comment activity:', error);
    }

    return comment;
  }

  /**
   * Reply to a comment (admin/author reply)
   * @param {string} parentId - Parent comment ID
   * @param {Object} data - Reply data
   * @param {Object} author - Author user object
   * @returns {Promise<Object>} - Created reply
   */
  async replyToComment(parentId, data, author) {
    // Get parent comment to find postId
    const parent = await this.getCommentById(parentId);
    if (!parent) {
      throw new Error('Parent comment not found');
    }

    const sanitizedContent = this.sanitizeContent(data.content);
    const replyId = crypto.randomUUID();

    await db
      .insert(comments)
      .values({
        id: replyId,
        postId: parent.postId,
        parentId: parentId,
        authorName: `${author.firstName} ${author.lastName}`.trim() || 'Admin',
        authorEmail: author.email,
        content: sanitizedContent,
        status: 'APPROVED',
      });

    const reply = await this.getCommentById(replyId);

    return reply;
  }

  /**
   * Update a comment
   * @param {string} id - Comment ID
   * @param {string} content - New content
   * @returns {Promise<Object>} - Updated comment
   */
  async updateComment(id, content) {
    const sanitizedContent = this.sanitizeContent(content);

    await db
      .update(comments)
      .set({
        content: sanitizedContent,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id));

    const updated = await this.getCommentById(id);

    return updated;
  }

  /**
   * Delete a comment (and all nested replies)
   * @param {string} id - Comment ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteComment(id) {
    // Delete will cascade to all nested replies due to ON DELETE CASCADE
    await db.delete(comments).where(eq(comments.id, id));
    return true;
  }

  /**
   * Get total comments count
   * @returns {Promise<number>} - Total comments
   */
  async getTotalComments() {
    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(comments)
      .where(eq(comments.status, 'APPROVED'));
    return Number(result.count);
  }

  /**
   * Get comments growth percentage (current period vs previous period)
   * @param {number} [days=30] - Number of days per period
   * @returns {Promise<Object>} - Growth data
   */
  async getCommentsGrowth(days = 30) {
    const now = new Date();

    // Current period
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const [currentResult] = await db
      .select({ count: sql`count(*)` })
      .from(comments)
      .where(
        and(
          gte(comments.createdAt, currentStart),
          lt(comments.createdAt, now),
          eq(comments.status, 'APPROVED')
        )
      );

    // Previous period
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
    const [previousResult] = await db
      .select({ count: sql`count(*)` })
      .from(comments)
      .where(
        and(
          gte(comments.createdAt, previousStart),
          lt(comments.createdAt, currentStart),
          eq(comments.status, 'APPROVED')
        )
      );

    const current = Number(currentResult.count);
    const previous = Number(previousResult.count);
    
    let trend;
    if (previous > 0) {
      trend = ((current - previous) / previous) * 100;
    } else if (current > 0) {
      // If previous was 0 but we have current, it's 100% growth (or more)
      trend = 100;
    } else {
      trend = 0;
    }

    return {
      current,
      previous,
      trend: Math.round(trend * 10) / 10
    };
  }
}

export const commentsService = new CommentsService();
