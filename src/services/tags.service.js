// src/services/tags.service.js
// Tags service for managing blog tags

import { db, tags, postTags } from '../db/index.js';
import { eq, like, desc, asc, sql } from 'drizzle-orm';
import { activityService } from './activity.service.js';

/**
 * Tags Service
 * Handles tag CRUD operations and business logic
 */
class TagsService {
  /**
   * Get all tags with optional filtering and pagination
   * @param {Object} options - Query options
   * @param {string} [options.search] - Search by name
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @returns {Promise<Object>} - Tags and pagination info
   */
  async getAll({
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = {}) {
    // Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(like(tags.name, `%${search}%`));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: sql`count(*)` }).from(tags);
    if (conditions.length > 0) {
      countQuery = countQuery.where(...conditions);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Build main query
    let query = db.select().from(tags);

    if (conditions.length > 0) {
      query = query.where(...conditions);
    }

    // Apply sorting
    const sortField = sortBy === 'name' ? tags.name : tags.createdAt;
    query = sortOrder === 'asc' ? query.orderBy(asc(sortField)) : query.orderBy(desc(sortField));

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const data = await query;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get tag by ID
   * @param {string} id - Tag ID
   * @returns {Promise<Object|null>} - Tag or null
   */
  async getById(id) {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id));

    return tag || null;
  }

  /**
   * Get tag by slug
   * @param {string} slug - Tag slug
   * @returns {Promise<Object|null>} - Tag or null
   */
  async getBySlug(slug) {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug));

    return tag || null;
  }

  /**
   * Create a new tag
   * @param {Object} data - Tag data
   * @param {string} userId - User ID creating the tag
   * @returns {Promise<Object>} - Created tag
   */
  async create(data, userId) {
    // Generate slug if not provided
    let { slug } = data;
    if (!slug) {
      slug = this.generateSlug(data.name);
    }

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new Error('A tag with this slug already exists');
    }

    // Create tag
    await db
      .insert(tags)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        postCount: 0,
      });

    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    // Log activity
    await activityService.log({
      userId,
      type: 'TAG_CREATED',
      description: `Created tag "${tag.name}"`,
      entityType: 'TAG',
      entityId: tag.id,
      metadata: { name: tag.name },
    });

    return tag;
  }

  /**
   * Update a tag
   * @param {string} id - Tag ID
   * @param {Object} data - Tag data to update
   * @param {string} userId - User ID updating the tag
   * @returns {Promise<Object>} - Updated tag
   */
  async update(id, data, userId) {
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    // Handle slug update separately to check for duplicates
    if (data.slug) {
      const existing = await this.getBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error('A tag with this slug already exists');
      }
      updateData.slug = data.slug;
    }

    await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id));

    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Log activity
    await activityService.log({
      userId,
      type: 'TAG_UPDATED',
      description: `Updated tag "${tag.name}"`,
      entityType: 'TAG',
      entityId: id,
      metadata: { name: tag.name },
    });

    return tag;
  }

  /**
   * Delete a tag
   * @param {string} id - Tag ID
   * @param {string} userId - User ID deleting the tag
   * @returns {Promise<Object>} - { deleted: true, postsAffected: count }
   */
  async delete(id, userId) {
    const tag = await this.getById(id);
    if (!tag) {
      throw new Error('Tag not found');
    }

    // Count posts with this tag before deletion
    const postCount = await this.getPostCount(id);

    // Delete related post_tags first
    await db.delete(postTags).where(eq(postTags.tagId, id));

    // Delete tag
    await db.delete(tags).where(eq(tags.id, id));

    // Log activity with post count info
    await activityService.log({
      userId,
      type: 'TAG_DELETED',
      description: `Deleted tag "${tag.name}"${postCount > 0 ? ` and removed it from ${postCount} post${postCount === 1 ? '' : 's'}` : ''}`,
      entityType: 'TAG',
      entityId: id,
      metadata: { 
        name: tag.name,
        postsAffected: postCount 
      },
    });

    return { deleted: true, postsAffected: postCount };
  }

  /**
   * Get post count for a tag
   * @param {string} tagId - Tag ID
   * @returns {Promise<number>} - Post count
   */
  async getPostCount(tagId) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(postTags)
      .where(eq(postTags.tagId, tagId));

    return Number(count);
  }

  /**
   * Generate a URL-friendly slug from a name
   * @param {string} name - Tag name
   * @returns {string} - Generated slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Increment post count for a tag
   * @param {string} tagId - Tag ID
   * @returns {Promise<void>}
   */
  async incrementPostCount(tagId) {
    await db
      .update(tags)
      .set({ postCount: sql`${tags.postCount} + 1` })
      .where(eq(tags.id, tagId));
  }

  /**
   * Decrement post count for a tag
   * @param {string} tagId - Tag ID
   * @returns {Promise<void>}
   */
  async decrementPostCount(tagId) {
    await db
      .update(tags)
      .set({ postCount: sql`GREATEST(${tags.postCount} - 1, 0)` })
      .where(eq(tags.id, tagId));
  }
}

// Export singleton
export const tagsService = new TagsService();
export default tagsService;
