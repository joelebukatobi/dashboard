// src/services/auth.service.js
import { db, users, sessions } from '../db/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateSecureToken, generateSessionId } from '../utils/security.js';
import crypto from 'crypto';

/**
 * Authentication Service
 * Handles all authentication-related database operations
 * Follows Single Responsibility Principle - only auth operations
 */
class AuthService {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<object|null>} - User object or null
   */
  async findUserByEmail(email) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Find user by ID
   * @param {string} id - User UUID
   * @returns {Promise<object|null>} - User object or null
   */
  async findUserById(id) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Validate user credentials
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<object>} - { valid: boolean, user?: object, errorType?: string }
   */
  async validateCredentials(email, password) {
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, errorType: 'INVALID_EMAIL_FORMAT' };
    }
    
    // Check password length
    if (password.length < 8) {
      return { valid: false, errorType: 'PASSWORD_TOO_SHORT' };
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return { valid: false, errorType: 'PASSWORD_NO_LOWERCASE' };
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { valid: false, errorType: 'PASSWORD_NO_UPPERCASE' };
    }
    
    // Check for number
    if (!/\d/.test(password)) {
      return { valid: false, errorType: 'PASSWORD_NO_NUMBER' };
    }
    
    // Find user by email
    const user = await this.findUserByEmail(email);
    
    if (!user) {
      return { valid: false, errorType: 'EMAIL_NOT_FOUND' };
    }
    
    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
      return { valid: false, errorType: 'ACCOUNT_SUSPENDED' };
    }
    
    // Check if user is invited (not yet active)
    if (user.status === 'INVITED') {
      return { valid: false, errorType: 'ACCOUNT_NOT_ACTIVATED' };
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return { valid: false, errorType: 'WRONG_PASSWORD' };
    }
    
    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;
    
    return { valid: true, user: userWithoutPassword };
  }

  /**
   * Create a new session for user
   * @param {string} userId - User UUID
   * @param {boolean} rememberMe - Whether to create long-lived session
   * @returns {Promise<object>} - Session object
   */
  async createSession(userId, rememberMe = false, jwtToken = null) {
    const token = jwtToken || generateSecureToken(32);
    const sessionId = generateSessionId();
    
    // Set expiration based on rememberMe
    const expiresAt = rememberMe 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 24 * 60 * 60 * 1000);    // 24 hours
    
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        userId,
        token,
        rememberMe,
        expiresAt
      });

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    
    return session;
  }

  /**
   * Find valid session by token
   * @param {string} token - Session token
   * @returns {Promise<object|null>} - Session with user or null
   */
  async findValidSession(token) {
    const result = await db
      .select({
        session: sessions,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          avatarUrl: users.avatarUrl
        }
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Delete session by token (logout)
   * @param {string} token - Session token
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSession(token) {
    await db
      .delete(sessions)
      .where(eq(sessions.token, token));
    
    return true;
  }

  /**
   * Delete all sessions for a user
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteAllUserSessions(userId) {
    await db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
    
    return true;
  }

  /**
   * Update last active timestamp
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   */
  async updateLastActive(userId) {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  /**
   * Create password reset token
   * @param {string} userId - User UUID
   * @returns {Promise<string>} - Reset token
   */
  async createPasswordResetToken(userId) {
    const { passwordResets } = await import('../db/schema.js');
    
    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db
      .insert(passwordResets)
      .values({
        userId,
        token,
        expiresAt
      });
    
    return token;
  }

  /**
   * Validate password reset token
   * @param {string} token - Reset token
   * @returns {Promise<object|null>} - User or null
   */
  async validatePasswordResetToken(token) {
    const { passwordResets } = await import('../db/schema.js');
    
    const result = await db
      .select({
        reset: passwordResets,
        user: users
      })
      .from(passwordResets)
      .innerJoin(users, eq(passwordResets.userId, users.id))
      .where(
        and(
          eq(passwordResets.token, token),
          gt(passwordResets.expiresAt, new Date()),
          eq(passwordResets.usedAt, null)
        )
      )
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Reset user password
   * @param {string} userId - User UUID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<boolean>} - Success status
   */
  async resetPassword(userId, newPassword) {
    const hashedPassword = await hashPassword(newPassword);
    
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // Invalidate all existing sessions
    await this.deleteAllUserSessions(userId);
    
    return true;
  }

  /**
   * Change user password (with old password verification)
   * @param {string} userId - User UUID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<object>} - { success: boolean, error?: string }
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findUserById(userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const isValid = await verifyPassword(oldPassword, user.password);
    
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    await this.resetPassword(userId, newPassword);
    
    return { success: true };
  }

  /**
   * Create new user
   * @param {object} userData - User data
   * @returns {Promise<object>} - Created user (without password)
   */
  async createUser(userData) {
    const hashedPassword = await hashPassword(userData.password);
    const userId = crypto.randomUUID();
    
    await db
      .insert(users)
      .values({
        id: userId,
        ...userData,
        password: hashedPassword,
        email: userData.email.toLowerCase()
      });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // Remove password from returned object
    const { password: _, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
