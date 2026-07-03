// src/middleware/authenticate.js
import { authService } from '../services/auth.service.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 * Following Single Responsibility Principle
 */

/**
 * Extract token from request
 * @param {object} request - Fastify request
 * @returns {string|null} - Token or null
 */
function extractToken(request) {
  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  return request.cookies.token || null;
}

/**
 * Authentication middleware
 * Verifies token and attaches user to request
 * @param {object} request - Fastify request
 * @param {object} reply - Fastify reply
 */
export async function authenticate(request, reply) {
  try {
    const token = extractToken(request);

    if (!token) {
      throw new Error('Authentication required');
    }

    // Verify JWT token
    const decoded = await request.jwtVerify(token);

    if (!decoded || !decoded.userId) {
      throw new Error('Invalid token');
    }

    // Validate session in database
    const sessionData = await authService.findValidSession(token);

    if (!sessionData) {
      throw new Error('Session expired or invalid');
    }

    const siteMap = request.siteSettingsMap ?? {};
    if (authService.isSessionIdleExpired(sessionData.session, sessionData.user, siteMap)) {
      await authService.deleteSession(token);
      throw new Error('Session expired due to inactivity');
    }

    // Check if user is still active
    if (sessionData.user.status === 'SUSPENDED') {
      throw new Error('Account suspended');
    }

    // Attach user to request
    request.user = sessionData.user;
    request.sessionToken = token;

    // Update last active (async, don't wait)
    authService.updateLastActive(sessionData.user.id).catch(() => {});

  } catch (err) {
    // Clear invalid token cookie
    reply.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    throw err;
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token valid, continues regardless
 * @param {object} request - Fastify request
 * @param {object} reply - Fastify reply
 */
export async function optionalAuth(request, reply) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      request.user = null;
      return;
    }
    
    const decoded = await request.jwtVerify(token);
    const sessionData = await authService.findValidSession(token);
    
    if (sessionData && sessionData.user.status !== 'SUSPENDED') {
      request.user = sessionData.user;
      request.sessionToken = token;
    } else {
      request.user = null;
    }
  } catch {
    request.user = null;
  }
}

/**
 * Check if user is authenticated
 * Returns boolean without throwing
 * @param {object} request - Fastify request
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(request) {
  try {
    const token = extractToken(request);
    if (!token) return false;
    
    const decoded = await request.jwtVerify(token);
    const sessionData = await authService.findValidSession(token);
    
    return !!(sessionData && sessionData.user.status !== 'SUSPENDED');
  } catch {
    return false;
  }
}

/**
 * Create preHandler hook for Fastify routes
 * Usage: fastify.get('/protected', { preHandler: requireAuth }, handler)
 */
export function requireAuth() {
  return authenticate;
}

/**
 * Middleware to redirect unauthenticated users to login
 * For HTML routes (not API)
 * @param {string} redirectTo - Where to redirect
 */
export function requireAuthRedirect(redirectTo = '/admin/auth/login') {
  return async function(request, reply) {
    try {
      await authenticate(request, reply);
    } catch {
      // For HTMX requests, return special header
      if (request.headers['hx-request']) {
        reply.header('HX-Redirect', redirectTo);
        reply.code(401).send({ error: 'Authentication required' });
      } else {
        reply.redirect(redirectTo);
      }
    }
  };
}
