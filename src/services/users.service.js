// src/services/users.service.js
import { db, users, posts } from '../db/index.js';
import { eq, and, like, desc, asc, sql } from 'drizzle-orm';
import { activityService } from './activity.service.js';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

/**
 * Users Service
 * Handles all user-related database operations
 */
class UsersService {
  /**
   * Get all users with filters and pagination
   * @param {Object} options - Query options
   * @param {string} [options.role] - Filter by role (ADMIN, EDITOR, AUTHOR, VIEWER)
   * @param {string} [options.status] - Filter by status (ACTIVE, INVITED, SUSPENDED)
   * @param {string} [options.search] - Search in name or email
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Users per page
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order (asc, desc)
   * @returns {Promise<Object>} - { users, total, page, totalPages }
   */
  async getAllUsers(options = {}) {
    const {
      role,
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

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    if (status) {
      whereConditions.push(eq(users.status, status));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        sql`(${users.firstName} LIKE ${searchTerm} OR ${users.lastName} LIKE ${searchTerm} OR ${users.email} LIKE ${searchTerm})`
      );
    }

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(users);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions));
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Get users
    let query = db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActiveAt: users.lastActiveAt,
        invitedAt: users.invitedAt,
      })
      .from(users);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Apply sorting
    const sortField = sortBy === 'name' 
      ? users.firstName 
      : sortBy === 'lastActive' 
        ? users.lastActiveAt 
        : users.createdAt;
    
    query = sortOrder === 'asc' 
      ? query.orderBy(asc(sortField)) 
      : query.orderBy(desc(sortField));

    // Apply pagination
    query = query.limit(ITEMS_PER_PAGE).offset(offset);

    const results = await query;

    return {
      users: results,
      total,
      page,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE),
      limit: ITEMS_PER_PAGE
    };
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async getUserById(id) {
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        invitedAt: users.invitedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return user || null;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User object or null
   */
  async getUserByEmail(email) {
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    return user || null;
  }

  /**
   * Create a new user
   * @param {Object} data - User data
   * @param {string} data.firstName - First name
   * @param {string} data.lastName - Last name
   * @param {string} data.email - Email
   * @param {string} data.role - Role (ADMIN, EDITOR, AUTHOR, VIEWER)
   * @param {string} [data.password] - Password (if not provided, user is invited)
   * @param {string} [data.avatarUrl] - Avatar URL
   * @param {string} [currentUserId] - ID of user creating this user (for activity log)
   * @returns {Promise<Object>} - Created user
   */
  async createUser(data, currentUserId) {
    const { firstName, lastName, email, role, password, avatarUrl } = data;

    const userData = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      role,
      avatarUrl: avatarUrl || null,
      status: password ? 'ACTIVE' : 'INVITED',
      invitedAt: password ? null : new Date(),
    };

    if (password) {
      const { default: bcrypt } = await import('bcryptjs');
      userData.password = await bcrypt.hash(password, 10);
    }

    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      ...userData,
    });

    const [newUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Log activity
    await activityService.createActivity({
      type: password ? 'USER_CREATED' : 'USER_INVITED',
      description: `${newUser.firstName} ${newUser.lastName} was ${password ? 'created' : 'invited'}`,
      userId: currentUserId,
      entityType: 'user',
      entityId: newUser.id,
      metadata: { role: newUser.role, email: newUser.email }
    });

    return newUser;
  }

  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @param {string} [currentUserId] - ID of user making the update (for activity log)
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(id, data, currentUserId) {
    const { firstName, lastName, email, role, avatarUrl } = data;

    const updateData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email: email.toLowerCase() }),
      ...(role && { role }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      updatedAt: new Date(),
    };

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id));

    const [updatedUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    // Log activity
    await activityService.createActivity({
      type: 'USER_UPDATED',
      description: `${updatedUser.firstName} ${updatedUser.lastName} was updated`,
      userId: currentUserId,
      entityType: 'user',
      entityId: id,
      metadata: { role: updatedUser.role }
    });

    return updatedUser;
  }

  /**
   * Delete a user
   * @param {string} id - User ID
   * @param {string} [currentUserId] - ID of user making the deletion (for activity log)
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteUser(id, currentUserId) {
    // Get user info before deleting (for activity log)
    const user = await this.getUserById(id);
    if (!user) {
      return false;
    }

    await db.delete(users).where(eq(users.id, id));

    // Log activity
    await activityService.createActivity({
      type: 'USER_DELETED',
      description: `${user.firstName} ${user.lastName} was deleted`,
      userId: currentUserId,
      entityType: 'user',
      entityId: id,
      metadata: { role: user.role, email: user.email }
    });

    return true;
  }

  /**
   * Suspend a user
   * @param {string} id - User ID
   * @param {string} [currentUserId] - ID of user suspending (for activity log)
   * @returns {Promise<Object>} - Updated user
   */
  async suspendUser(id, currentUserId) {
    await db
      .update(users)
      .set({
        status: 'SUSPENDED',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    const [updatedUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    // Log activity
    await activityService.createActivity({
      type: 'USER_SUSPENDED',
      description: `${updatedUser.firstName} ${updatedUser.lastName} was suspended`,
      userId: currentUserId,
      entityType: 'user',
      entityId: id,
    });

    return updatedUser;
  }

  /**
   * Activate a suspended user
   * @param {string} id - User ID
   * @param {string} [currentUserId] - ID of user activating (for activity log)
   * @returns {Promise<Object>} - Updated user
   */
  async activateUser(id, currentUserId) {
    await db
      .update(users)
      .set({
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    const [updatedUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    // Log activity
    await activityService.createActivity({
      type: 'USER_ACTIVATED',
      description: `${updatedUser.firstName} ${updatedUser.lastName} was activated`,
      userId: currentUserId,
      entityType: 'user',
      entityId: id,
    });

    return updatedUser;
  }

  /**
   * Resend invitation to a user
   * @param {string} id - User ID
   * @param {string} [currentUserId] - ID of user resending (for activity log)
   * @returns {Promise<Object>} - Updated user
   */
  async resendInvite(id, currentUserId) {
    await db
      .update(users)
      .set({
        invitedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    const [updatedUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        invitedAt: users.invitedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    // Log activity
    await activityService.createActivity({
      type: 'USER_INVITED',
      description: `Invitation resent to ${updatedUser.firstName} ${updatedUser.lastName}`,
      userId: currentUserId,
      entityType: 'user',
      entityId: id,
    });

    return updatedUser;
  }

  /**
   * Count users by role
   * @returns {Promise<Object>} - Role counts
   */
  async countByRole() {
    const results = await db
      .select({
        role: users.role,
        count: sql`count(*)`,
      })
      .from(users)
      .groupBy(users.role);

    return results.reduce((acc, row) => {
      acc[row.role] = Number(row.count);
      return acc;
    }, {});
  }

  /**
   * Count users by status
   * @returns {Promise<Object>} - Status counts
   */
  async countByStatus() {
    const results = await db
      .select({
        status: users.status,
        count: sql`count(*)`,
      })
      .from(users)
      .groupBy(users.status);

    return results.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
  }

  /**
   * Check if a user is the last admin
   * @param {string} excludeUserId - User ID to exclude from count
   * @returns {Promise<boolean>} - True if no other admins exist
   */
  async isLastAdmin(excludeUserId) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, 'ADMIN'),
          eq(users.status, 'ACTIVE'),
          sql`${users.id} != ${excludeUserId}`
        )
      );

    return Number(count) === 0;
  }

  /**
   * Upload and process avatar image
   * @param {string} userId - User ID
   * @param {Object} file - File object from multipart upload
   * @returns {Promise<string>} - Avatar URL
   */
  async uploadAvatar(userId, file) {
    const uploadDir = path.join(process.cwd(), 'public/uploads/users', userId);
    const avatarPath = path.join(uploadDir, 'avatar.jpg');

    // Create user directory if it doesn't exist
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Delete old avatar if exists
    try {
      await fs.access(avatarPath);
      await fs.unlink(avatarPath);
    } catch {
      // File doesn't exist, that's fine
    }

    // Process and save new avatar (400x400, JPEG)
    const buffer = await file.toBuffer();
    await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toFile(avatarPath);

    // Return the URL path
    return `/uploads/users/${userId}/avatar.jpg`;
  }

  /**
   * Update user's avatar URL
   * @param {string} userId - User ID
   * @param {string} avatarUrl - Avatar URL
   * @returns {Promise<Object>} - Updated user
   */
  async updateAvatar(userId, avatarUrl) {
    await db
      .update(users)
      .set({
        avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const [updatedUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return updatedUser;
  }

  /**
   * Get user statistics (posts created)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Stats object
   */
  async getUserStats(userId) {
    // Count posts created by user
    const [postsCount] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(eq(posts.authorId, userId));

    return {
      postsCount: Number(postsCount.count),
      tagsCount: 0,
      categoriesCount: 0,
      usersCount: 0,
    };
  }
}

export const usersService = new UsersService();
