// src/services/subscribers.service.js
// Subscribers Service - Handles all subscriber-related database operations

import { db, subscribers, activities } from '../db/index.js';
import { eq, and, like, desc, asc, sql, gte, lt } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Subscribers Service
 * Handles all subscriber-related database operations
 */
class SubscribersService {
  /**
   * Get all subscribers with filters and pagination
   * @param {Object} options - Query options
   * @param {string} [options.status] - Filter by status (ACTIVE, PENDING, UNSUBSCRIBED, BOUNCED)
   * @param {string} [options.search] - Search in name or email
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Subscribers per page
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order (asc, desc)
   * @returns {Promise<Object>} - { subscribers, total, page, totalPages }
   */
  async getAllSubscribers(options = {}) {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const ITEMS_PER_PAGE = limit;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // Build where conditions
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(subscribers.status, status));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        sql`(${subscribers.name} LIKE ${searchTerm} OR ${subscribers.email} LIKE ${searchTerm})`
      );
    }

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(subscribers);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions));
    }
    const countResult = await countQuery;
    const total = Number(countResult[0].count);

    // Build main query
    let query = db.select().from(subscribers);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Apply sorting
    const sortField = subscribers[sortBy] || subscribers.createdAt;
    query = query.orderBy(sortOrder === 'asc' ? asc(sortField) : desc(sortField));

    // Apply pagination
    query = query.limit(ITEMS_PER_PAGE).offset(offset);

    const subscribersList = await query;

    return {
      subscribers: subscribersList,
      total,
      page,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE)
    };
  }

  /**
   * Get subscriber by ID
   * @param {string} id - Subscriber ID
   * @returns {Promise<Object|null>} - Subscriber object or null
   */
  async getSubscriberById(id) {
    const result = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
    return result[0] || null;
  }

  /**
   * Get subscriber by email
   * @param {string} email - Subscriber email
   * @returns {Promise<Object|null>} - Subscriber object or null
   */
  async getSubscriberByEmail(email) {
    const result = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
    return result[0] || null;
  }

  /**
   * Create a new subscriber
   * @param {Object} data - Subscriber data
   * @param {string} data.email - Subscriber email
   * @param {string} [data.name] - Subscriber name
   * @param {string} [data.status='ACTIVE'] - Subscriber status
   * @returns {Promise<Object>} - Created subscriber
   */
  async createSubscriber(data) {
    const subscriberId = crypto.randomUUID();

    await db.insert(subscribers).values({
      id: subscriberId,
      email: data.email,
      name: data.name || null,
      status: data.status || 'ACTIVE',
      confirmedAt: data.status === 'ACTIVE' ? new Date() : null
    });

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    // Log SUBSCRIBER_CREATED activity
    try {
      await db.insert(activities).values({
        type: 'SUBSCRIBER_CREATED',
        description: `${data.name || data.email} subscribed to the newsletter`,
        userId: null,
        entityId: subscriber.id,
        entityType: 'SUBSCRIBER',
        createdAt: new Date(),
      });
    } catch (error) {
      // Don't fail if activity logging fails
      console.error('Failed to log subscriber activity:', error);
    }

    return subscriber;
  }

  /**
   * Update a subscriber
   * @param {string} id - Subscriber ID
   * @param {Object} data - Update data
   * @param {string} [data.name] - Subscriber name
   * @param {string} [data.email] - Subscriber email
   * @param {string} [data.status] - Subscriber status
   * @returns {Promise<Object|null>} - Updated subscriber or null
   */
  async updateSubscriber(id, data) {
    const updateData = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name || null;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      // Update confirmedAt if status changes to ACTIVE
      if (data.status === 'ACTIVE') {
        updateData.confirmedAt = new Date();
      }
      // Update unsubscribedAt if status changes to UNSUBSCRIBED
      if (data.status === 'UNSUBSCRIBED') {
        updateData.unsubscribedAt = new Date();
      }
    }

    await db.update(subscribers)
      .set(updateData)
      .where(eq(subscribers.id, id));

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, id))
      .limit(1);

    return subscriber || null;
  }

  /**
   * Delete a subscriber
   * @param {string} id - Subscriber ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteSubscriber(id) {
    await db.delete(subscribers).where(eq(subscribers.id, id));
    return true;
  }

  /**
   * Get total subscriber count
   * @param {Object} options - Filter options
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<number>} - Total count
   */
  async getSubscriberCount(options = {}) {
    const { status } = options;

    let query = db.select({ count: sql`count(*)` }).from(subscribers);

    if (status) {
      query = query.where(eq(subscribers.status, status));
    }

    const result = await query;
    return Number(result[0].count);
  }

  /**
   * Get subscriber growth percentage (current period vs previous period)
   * @param {number} [days=30] - Number of days per period
   * @returns {Promise<Object>} - Growth data
   */
  async getSubscriberGrowth(days = 30) {
    const now = new Date();

    // Current period
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const [currentResult] = await db
      .select({ count: sql`count(*)` })
      .from(subscribers)
      .where(
        and(
          gte(subscribers.createdAt, currentStart),
          lt(subscribers.createdAt, now),
          eq(subscribers.status, 'ACTIVE')
        )
      );

    // Previous period
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
    const [previousResult] = await db
      .select({ count: sql`count(*)` })
      .from(subscribers)
      .where(
        and(
          gte(subscribers.createdAt, previousStart),
          lt(subscribers.createdAt, currentStart),
          eq(subscribers.status, 'ACTIVE')
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

export const subscribersService = new SubscribersService();
