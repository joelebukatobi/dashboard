// src/admin/controllers/api/comments.controller.js
// Public API controller for comments

import { commentsService } from '../../../services/comments.service.js';
import { postsService } from '../../../services/posts.service.js';
import { getPublicPageLimit } from '../../../lib/site-pagination.js';
import { db, comments } from '../../../db/index.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

/**
 * Comments API Controller
 * Handles public API requests for comments
 */
class CommentsAPIController {
  /**
   * GET /api/v1/posts/:slug/comments
   * Get comments for a post (nested structure)
   */
  async getByPostSlug(request, reply) {
    try {
      const { slug } = request.params;
      const { page = 1, limit } = request.query;
      const pageNum = parseInt(page, 10) || 1;
      const siteMap = request.siteSettingsMap ?? {};
      const limitNum = getPublicPageLimit(siteMap, limit);

      // Get post by slug
      const post = await postsService.getPostBySlug(slug);
      
      if (!post || post.status !== 'PUBLISHED') {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Post not found',
        });
      }

      // Get all approved comments for this post
      const allComments = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          parentId: comments.parentId,
          authorName: comments.authorName,
          authorEmail: comments.authorEmail,
          content: comments.content,
          status: comments.status,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(
          eq(comments.postId, post.id),
          eq(comments.status, 'APPROVED')
        ))
        .orderBy(desc(comments.createdAt));

      // Build nested tree structure
      const commentTree = this.buildCommentTree(allComments);

      // Paginate top-level comments
      const total = commentTree.length;
      const totalPages = Math.ceil(total / limitNum);
      const offset = (pageNum - 1) * limitNum;
      const paginatedComments = commentTree.slice(offset, offset + limitNum);

      return reply.send({
        data: paginatedComments,
        meta: {
          current_page: pageNum,
          per_page: limitNum,
          total,
          last_page: totalPages,
        },
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch comments',
      });
    }
  }

  /**
   * POST /api/v1/comments
   * Create a new comment (public)
   */
  async create(request, reply) {
    try {
      const { postSlug, authorName, authorEmail, content, parentId } = request.body;

      // Validate required fields
      if (!postSlug || !content) {
        reply.code(400);
        return reply.send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Post slug and content are required',
        });
      }

      // Content length validation
      if (content.length < 2 || content.length > 5000) {
        reply.code(400);
        return reply.send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Content must be between 2 and 5000 characters',
        });
      }

      // Check honeypot (hidden field that bots fill)
      if (request.body.website || request.body.url) {
        // Silently reject spam bots
        return reply.send({
          success: true,
          comment: { id: 'pending', status: 'pending' },
        });
      }

      // Rate limiting check (simplified - in production use Redis)
      const clientIp = request.ip;
      const rateCheck = await this.checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        reply.code(429);
        return reply.send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Please wait ${rateCheck.retryAfter} seconds before posting again`,
        });
      }

      // Get post by slug
      const post = await postsService.getPostBySlug(postSlug);
      
      if (!post || post.status !== 'PUBLISHED') {
        reply.code(404);
        return reply.send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Post not found',
        });
      }

      // Validate parent comment if provided
      if (parentId) {
        const parentComment = await db
          .select({ id: comments.id })
          .from(comments)
          .where(and(
            eq(comments.id, parentId),
            eq(comments.postId, post.id),
            eq(comments.status, 'APPROVED')
          ))
          .limit(1);

        if (parentComment.length === 0) {
          reply.code(400);
          return reply.send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Parent comment not found',
          });
        }
      }

      // Spam checks
      const spamCheck = this.checkSpam(content, authorName, authorEmail);
      if (spamCheck.isSpam) {
        reply.code(400);
        return reply.send({
          statusCode: 400,
          error: 'Bad Request',
          message: spamCheck.message,
        });
      }

      // Comments disabled site-wide
      const siteMap = request.siteSettingsMap ?? {};
      if (siteMap.enableComments === false) {
        reply.code(403);
        return reply.send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Comments are disabled on this site',
        });
      }

      const commentStatus = siteMap.moderateComments === true ? 'PENDING' : 'APPROVED';

      // Create comment
      const comment = await commentsService.createComment({
        postId: post.id,
        parentId: parentId || null,
        authorName: authorName?.trim() || 'Anonymous',
        authorEmail: authorEmail?.trim() || null,
        content: content.trim(),
      }, { status: commentStatus });

      const responseComment = {
        id: comment.id,
        authorName: comment.authorName,
        content: commentStatus === 'APPROVED' ? comment.content : undefined,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        status: commentStatus.toLowerCase(),
      };

      return reply.code(201).send({
        success: true,
        message: commentStatus === 'PENDING'
          ? 'Comment submitted for moderation'
          : 'Comment posted successfully',
        comment: responseComment,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to create comment',
      });
    }
  }

  /**
   * Build nested comment tree from flat list
   */
  buildCommentTree(comments) {
    const commentMap = new Map();
    const roots = [];

    // First pass: create map
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
      });
    });

    // Second pass: build tree
    comments.forEach(comment => {
      const node = commentMap.get(comment.id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        const parent = commentMap.get(comment.parentId);
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  constructor() {
    // Simple in-memory rate limiting store
    // In production, use Redis
    this.rateLimitStore = new Map();
  }

  /**
   * Check rate limiting
   * Max 3 comments per minute per IP
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 3;

    const record = this.rateLimitStore.get(ip);

    if (!record) {
      // First comment from this IP
      this.rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (now > record.resetTime) {
      // Window expired, reset
      this.rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment count
    record.count++;
    return { allowed: true, retryAfter: 0 };
  }

  /**
   * Spam detection checks
   */
  checkSpam(content, authorName, authorEmail) {
    const lowerContent = content.toLowerCase();
    
    // Banned words list
    const bannedWords = [
      'viagra', 'cialis', 'casino', 'lottery', 'winner', 'click here',
      'buy now', 'act now', 'limited time', 'make money fast',
    ];
    
    for (const word of bannedWords) {
      if (lowerContent.includes(word)) {
        return { isSpam: true, message: 'Comment contains prohibited content' };
      }
    }

    // Link limit (max 2 URLs)
    const urlMatches = content.match(/https?:\/\/|www\./g);
    if (urlMatches && urlMatches.length > 2) {
      return { isSpam: true, message: 'Too many links in comment' };
    }

    // Excessive caps (more than 50% caps)
    const letters = content.replace(/[^a-zA-Z]/g, '');
    const caps = content.replace(/[^A-Z]/g, '');
    if (letters.length > 20 && (caps.length / letters.length) > 0.5) {
      return { isSpam: true, message: 'Please avoid excessive capitalization' };
    }

    return { isSpam: false };
  }
}

// Export singleton
export const commentsAPIController = new CommentsAPIController();
export default commentsAPIController;
