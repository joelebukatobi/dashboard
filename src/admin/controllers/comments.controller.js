// src/admin/controllers/comments.controller.js
// Comments controller - handles comment HTTP requests

import { commentsService } from '../../services/comments.service.js';
import { postsService } from '../../services/posts.service.js';
import { successToast, errorToast } from '../templates/partials/alerts.js';
import { renderAdminPage, renderFragment, renderEmpty, setHtmxTrigger } from '../render.js';

/**
 * Comments Controller
 * Handles comment-related HTTP requests
 */
class CommentsController {
  /**
   * GET /admin/posts/:postId/comments
   * Show comments page for a post
   */
  async showComments(request, reply) {
    try {
      const user = request.user;
      const { postId } = request.params;
      const page = parseInt(request.query.page) || 1;

      // Get post details
      const post = await postsService.getPostById(postId);
      if (!post) {
        reply.code(404);
        return reply.html`!${errorToast({
          message: 'Post not found.',
        })}`;
      }

      // Get comments for post
      const { comments, pagination } = await commentsService.getCommentsByPostId(postId, page);

      const { postCommentsContent, postCommentsMeta } = await import('../templates/pages/posts/comments.js');

      return renderAdminPage(
        request,
        reply,
        postCommentsMeta({ post, user: request.user }),
        postCommentsContent({ user, post, comments, pagination, toast: request.query.toast }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorToast({
        message: 'Failed to load comments.',
      })}`;
    }
  }

  /**
   * POST /admin/posts/:postId/comments/reply
   * Reply to a comment
   */
  async replyToComment(request, reply) {
    try {
      const user = request.user;
      const { postId } = request.params;
      const { parentId, content } = request.body;

      // Create reply
      const newReply = await commentsService.replyToComment(parentId, { content }, user);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        const { renderCommentPartial } = await import('../templates/pages/posts/comments.js');
        return renderFragment(
          setHtmxTrigger(reply, {
            toast: { message: 'Reply posted successfully.', type: 'success' },
          }),
          renderCommentPartial(newReply, user, 1),
        );
      }

      // Redirect back to comments page
      return reply.redirect(`/admin/posts/${postId}/comments?toast=replied`);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorToast({
        message: 'Failed to post reply.',
      })}`;
    }
  }

  /**
   * PUT /admin/comments/:id
   * Update a comment
   */
  async updateComment(request, reply) {
    try {
      const { id } = request.params;
      const { content } = request.body;

      // Update comment
      const updatedComment = await commentsService.updateComment(id, content);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return the updated content HTML with (edited) indicator
        const escapedContent = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>');
        
        setHtmxTrigger(reply, {
          toast: { message: 'Comment updated successfully.', type: 'success' },
        });
        return reply.html`!${escapedContent}`;
      }

      return reply.send({ success: true, comment: updatedComment });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorToast({
        message: 'Failed to update comment.',
      })}`;
    }
  }

  /**
   * DELETE /admin/comments/:id
   * Delete a comment
   */
  async deleteComment(request, reply) {
    try {
      const { postId, id } = request.params;

      await commentsService.deleteComment(id);

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return empty content to remove the comment from DOM
        return renderEmpty(setHtmxTrigger(reply, {
          toast: { message: 'Comment deleted successfully.', type: 'success' },
        }));
      }

      // Redirect back to comments page with toast
      return reply.redirect(`/admin/posts/${postId}/comments?toast=deleted`);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorToast({
        message: 'Failed to delete comment.',
      })}`;
    }
  }

  /**
   * POST /api/comments
   * Public API - Create comment from website (future use)
   */
  async createCommentPublic(request, reply) {
    try {
      const { postId, authorName, authorEmail, content, parentId } = request.body;

      // Validate required fields
      if (!postId || !content) {
        reply.code(400);
        return reply.type('application/json').send({
          error: 'Post ID and content are required.',
        });
      }

      // Check if post exists and is published
      const post = await postsService.getPostById(postId);
      if (!post || post.status !== 'PUBLISHED') {
        reply.code(404);
        return reply.type('application/json').send({
          error: 'Post not found.',
        });
      }

      // Create comment (auto-approved)
      const comment = await commentsService.createComment({
        postId,
        parentId: parentId || null,
        authorName: authorName || 'Anonymous',
        authorEmail: authorEmail || null,
        content,
      });

      return reply.type('application/json').send({
        success: true,
        comment,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('application/json').send({
        error: 'Failed to create comment.',
      });
    }
  }
}

export const commentsController = new CommentsController();
