// src/services/post-likes.service.js
// Post likes service — toggles an anonymous visitor's like on a post

import { db, postLikes, posts } from '../db/index.js';
import { and, eq, sql } from 'drizzle-orm';

class PostLikesService {
  /**
   * @param {string} postId
   * @param {string} visitorId
   * @returns {Promise<boolean>}
   */
  async hasLiked(postId, visitorId) {
    if (!visitorId) return false;

    const [row] = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.visitorId, visitorId)))
      .limit(1);

    return !!row;
  }

  /**
   * Toggle a visitor's like on a post.
   * @param {string} postId
   * @param {string} visitorId
   * @returns {Promise<{liked: boolean, likeCount: number}>}
   */
  async toggle(postId, visitorId) {
    const alreadyLiked = await this.hasLiked(postId, visitorId);

    if (alreadyLiked) {
      await db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.visitorId, visitorId)));

      await db
        .update(posts)
        .set({ likeCount: sql`CASE WHEN ${posts.likeCount} > 0 THEN ${posts.likeCount} - 1 ELSE 0 END` })
        .where(eq(posts.id, postId));
    } else {
      try {
        await db.insert(postLikes).values({ postId, visitorId });

        await db
          .update(posts)
          .set({ likeCount: sql`${posts.likeCount} + 1` })
          .where(eq(posts.id, postId));
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        // Lost a race to a concurrent request for the same visitor — it already
        // inserted and incremented. Nothing more to do here.
      }
    }

    const [post] = await db.select({ likeCount: posts.likeCount }).from(posts).where(eq(posts.id, postId));
    const liked = await this.hasLiked(postId, visitorId);

    return { liked, likeCount: post?.likeCount ?? 0 };
  }
}

export const postLikesService = new PostLikesService();
export default postLikesService;
