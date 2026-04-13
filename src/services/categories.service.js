// src/services/categories.service.js
// Categories service for managing blog categories

import { db, categories, posts } from '../db/index.js';
import { eq, like, desc, asc, sql } from 'drizzle-orm';
import { activityService } from './activity.service.js';

/**
 * Categories Service
 * Handles category CRUD operations and business logic
 */
class CategoriesService {
  /**
   * Get all categories with optional filtering and pagination
   * @param {Object} options - Query options
   * @param {string} [options.search] - Search by title
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @returns {Promise<Object>} - Categories and pagination info
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
      conditions.push(like(categories.title, `%${search}%`));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: sql`count(*)` }).from(categories);
    if (conditions.length > 0) {
      countQuery = countQuery.where(...conditions);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Build main query
    let query = db.select().from(categories);

    if (conditions.length > 0) {
      query = query.where(...conditions);
    }

    // Apply sorting
    const sortField = sortBy === 'title' ? categories.title : categories.createdAt;
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
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object|null>} - Category or null
   */
  async getById(id) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    return category || null;
  }

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object|null>} - Category or null
   */
  async getBySlug(slug) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));

    return category || null;
  }

  /**
   * Create a new category
   * @param {Object} data - Category data
   * @param {string} data.title - Category title
   * @param {string} [data.slug] - Category slug (auto-generated if not provided)
   * @param {string} [data.description] - Category description
   * @param {string} userId - User creating the category
   * @returns {Promise<Object>} - Created category
   */
  async create(data, userId) {
    // Generate slug from title if not provided
    let slug = data.slug;
    if (!slug) {
      slug = this.generateSlug(data.title);
    }

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new Error(`Category with slug "${slug}" already exists`);
    }

    await db
      .insert(categories)
      .values({
        title: data.title,
        slug,
        description: data.description,
        postCount: 0,
      });

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    // Log activity
    await activityService.logPostCreated(userId, {
      id: category.id,
      title: category.title,
      slug: category.slug,
      type: 'category',
    });

    return category;
  }

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} data - Update data
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} - Updated category
   */
  async update(id, data, userId) {
    // Get existing category
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    // Check for slug conflict if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.getBySlug(data.slug);
      if (slugExists) {
        throw new Error(`Category with slug "${data.slug}" already exists`);
      }
    }

    // Track changes for activity log
    const changes = {};
    if (data.title && data.title !== existing.title) {
      changes.title = { from: existing.title, to: data.title };
    }

    await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    // Log activity
    if (Object.keys(changes).length > 0) {
      await activityService.logPostUpdated(userId, {
        id: category.id,
        title: category.title,
        slug: category.slug,
        type: 'category',
      }, changes);
    }

    return category;
  }

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @param {string} userId - User making the deletion
   * @returns {Promise<boolean>} - Success status
   */
  async delete(id, userId) {
    const category = await this.getById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Count posts in this category
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(eq(posts.categoryId, id));

    // Move posts to NULL category before deleting
    if (count > 0) {
      await db
        .update(posts)
        .set({ categoryId: null })
        .where(eq(posts.categoryId, id));
    }

    // Log activity before deletion
    await activityService.log({
      userId,
      type: 'CATEGORY_DELETED',
      description: `Deleted category "${category.title}"${count > 0 ? ` and moved ${count} post${count === 1 ? '' : 's'} to Uncategorized` : ''}`,
      entityType: 'category',
      entityId: category.id,
      metadata: { 
        title: category.title, 
        slug: category.slug,
        postsAffected: count 
      },
    });

    await db.delete(categories).where(eq(categories.id, id));

    return { deleted: true, postsMoved: count };
  }

  /**
   * Get total category count
   * @returns {Promise<Object>} - Total count
   */
  async getCounts() {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(categories);

    return { total: Number(count) };
  }

  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Category title
   * @returns {string} - Generated slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  /**
   * Increment category post count
   * @param {string} categoryId - Category ID
   * @returns {Promise<void>}
   */
  async incrementPostCount(categoryId) {
    await db
      .update(categories)
      .set({
        postCount: sql`${categories.postCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));
  }

  /**
   * Decrement category post count
   * @param {string} categoryId - Category ID
   * @returns {Promise<void>}
   */
  async decrementPostCount(categoryId) {
    await db
      .update(categories)
      .set({
        postCount: sql`CASE WHEN ${categories.postCount} > 0 THEN ${categories.postCount} - 1 ELSE 0 END`,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));
  }
}

// Export singleton
export const categoriesService = new CategoriesService();
export default categoriesService;
