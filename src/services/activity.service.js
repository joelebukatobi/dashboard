// src/services/activity.service.js
// Activity logging service for tracking user actions

import { db, activities, users } from '../db/index.js';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Activity Service
 * Handles logging and retrieving user activities
 * Following Single Responsibility Principle
 */
class ActivityService {
  async createActivity(data) {
    return this.log(data);
  }

  /**
   * Log a new activity
   * @param {Object} data - Activity data
   * @param {string} [data.userId] - User who performed the action
   * @param {string} data.type - Activity type (POST_CREATED, POST_UPDATED, etc.)
   * @param {string} data.description - Human-readable description
   * @param {string} [data.entityType] - Type of entity (post, category, user, etc.)
   * @param {string} [data.entityId] - UUID of affected entity
   * @param {Object} [data.metadata] - Additional data (e.g., before/after snapshots)
   * @returns {Promise<Object>} - Created activity
   */
  async log(data) {
    const { userId, type, description, entityType, entityId, metadata } = data;
    const activityId = crypto.randomUUID();

    await db.insert(activities).values({
      id: activityId,
      userId,
      type,
      description,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    return activity;
  }

  /**
   * Get recent activities with user details
   * @param {Object} options - Query options
   * @param {number} [options.limit=10] - Number of activities to return
   * @param {number} [options.days=7] - Activities from last N days
   * @returns {Promise<Array>} - Activities with user info
   */
  async getRecent({ limit = 10, days = 7 } = {}) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(gte(activities.createdAt, since))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return results.map(r => ({
      ...r.activity,
      user: r.user?.id ? r.user : null,
    }));
  }

  /**
   * Get activities for a specific entity
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity UUID
   * @param {number} [limit=10] - Number of activities
   * @returns {Promise<Array>} - Activities
   */
  async getByEntity(entityType, entityId, limit = 10) {
    return await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, entityType),
          eq(activities.entityId, entityId)
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  /**
   * Get activity statistics
   * @param {Object} options - Options
   * @param {number} [options.days=30] - Stats for last N days
   * @returns {Promise<Object>} - Activity stats
   */
  async getStats({ days = 30 } = {}) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await db
      .select({
        type: activities.type,
        count: sql`count(*)`,
      })
      .from(activities)
      .where(gte(activities.createdAt, since))
      .groupBy(activities.type);

    return stats.reduce((acc, row) => {
      acc[row.type] = row.count;
      return acc;
    }, {});
  }

  /**
   * Clean old activities
   * @param {number} [days=90] - Keep activities from last N days
   * @returns {Promise<number>} - Number of deleted activities
   */
  async cleanOld(days = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await db
      .delete(activities)
      .where(lte(activities.createdAt, cutoff));

    return result.rowCount || 0;
  }

  // ============================================
  // Convenience Methods for Common Activities
  // ============================================

  /**
   * Log post creation
   */
  async logPostCreated(userId, post, metadata = {}) {
    return this.log({
      userId,
      type: 'POST_CREATED',
      description: `Created post "${post.title}"`,
      entityType: 'post',
      entityId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        status: post.status,
        ...metadata,
      },
    });
  }

  /**
   * Log post update
   */
  async logPostUpdated(userId, post, changes = {}) {
    return this.log({
      userId,
      type: 'POST_UPDATED',
      description: `Updated post "${post.title}"`,
      entityType: 'post',
      entityId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        changes,
      },
    });
  }

  /**
   * Log post publication
   */
  async logPostPublished(userId, post) {
    return this.log({
      userId,
      type: 'POST_PUBLISHED',
      description: `Published post "${post.title}"`,
      entityType: 'post',
      entityId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        publishedAt: post.publishedAt,
      },
    });
  }

  /**
   * Log post deletion
   */
  async logPostDeleted(userId, post) {
    return this.log({
      userId,
      type: 'POST_DELETED',
      description: `Deleted post "${post.title}"`,
      entityType: 'post',
      entityId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
      },
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(userId, ipAddress) {
    return this.log({
      userId,
      type: 'LOGIN',
      description: 'User logged in',
      entityType: 'user',
      entityId: userId,
      metadata: { ipAddress },
    });
  }

  /**
   * Log user logout
   */
  async logUserLogout(userId) {
    return this.log({
      userId,
      type: 'LOGOUT',
      description: 'User logged out',
      entityType: 'user',
      entityId: userId,
    });
  }
}

// Export singleton
export const activityService = new ActivityService();
export default activityService;
