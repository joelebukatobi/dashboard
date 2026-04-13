// src/utils/security.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Password hashing configuration
const SALT_ROUNDS = 12; // High cost factor for security

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} - Whether password matches
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex encoded token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure session ID
 * @returns {string} - Session ID
 */
export function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Sanitize user input to prevent injection
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Rate limiter configuration for auth endpoints
 * Returns true if request should be blocked
 * @param {Map} store - In-memory store (use Redis in production)
 * @param {string} key - Identifier (IP or user ID)
 * @param {number} maxAttempts - Max attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} - { blocked: boolean, remaining: number }
 */
export function checkRateLimit(store, key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  // Disable rate limiting in development mode
  if (process.env.NODE_ENV === 'development') {
    return { blocked: false, remaining: maxAttempts };
  }

  const now = Date.now();
  const record = store.get(key);
  
  if (!record) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { blocked: false, remaining: maxAttempts - 1 };
  }
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { blocked: false, remaining: maxAttempts - 1 };
  }
  
  record.count++;
  
  if (record.count > maxAttempts) {
    return { blocked: true, remaining: 0 };
  }
  
  return { blocked: false, remaining: maxAttempts - record.count };
}

/**
 * Clear rate limit for a key (after successful login)
 * @param {Map} store - Rate limit store
 * @param {string} key - Key to clear
 */
export function clearRateLimit(store, key) {
  store.delete(key);
}
