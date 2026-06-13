// src/admin/controllers/auth.controller.js
import { authService } from '../../services/auth.service.js';
import { checkRateLimit, clearRateLimit } from '../../utils/security.js';
import { errorAlert, successAlert } from '../render.js';

// In-memory rate limit store (use Redis in production)
const loginAttempts = new Map();

/**
 * Auth Controller
 * Handles authentication HTTP requests
 * Following Controller pattern - only handles HTTP layer
 */
class AuthController {
  /**
   * POST /admin/auth/login
   * Handle user login
   */
  async login(request, reply) {
    try {
      // Get client IP for rate limiting
      const clientIp = request.ip;
      
      // Check rate limit
      const rateLimit = checkRateLimit(loginAttempts, clientIp, 5, 15 * 60 * 1000);
      if (rateLimit.blocked) {
        reply.code(429);
        return reply.html`${'Too many login attempts. Please try again in 15 minutes.'}`;
      }
      
      const { email, password, rememberMe } = request.body;
      
      // Validate credentials
      const result = await authService.validateCredentials(email, password);
      
      if (!result.valid) {
        // Map error types to specific messages
        const errorMessages = {
          'INVALID_EMAIL_FORMAT': 'Invalid email format',
          'PASSWORD_TOO_SHORT': 'Password must be at least 8 characters',
          'PASSWORD_NO_LOWERCASE': 'Password must contain at least 1 lowercase letter',
          'PASSWORD_NO_UPPERCASE': 'Password must contain at least 1 uppercase letter',
          'PASSWORD_NO_NUMBER': 'Password must contain at least 1 number',
          'EMAIL_NOT_FOUND': 'Email not found',
          'WRONG_PASSWORD': 'Wrong password',
          'ACCOUNT_SUSPENDED': 'Account suspended',
          'ACCOUNT_NOT_ACTIVATED': 'Account not activated'
        };
        
        const message = errorMessages[result.errorType] || 'Invalid credentials';
        return reply.html`${message}`;
      }
      
      // Clear rate limit on successful login
      clearRateLimit(loginAttempts, clientIp);
      
      // Generate JWT token first
      const token = await reply.jwtSign(
        { 
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role 
        },
        { expiresIn: rememberMe ? '30d' : '24h' }
      );
      
      // Create session with JWT token
      const session = await authService.createSession(result.user.id, rememberMe, token);
      
      // Set HTTP-only cookie
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      });
      
      // Return success with redirect
      reply.header('HX-Redirect', '/admin');
      return reply.html`!${successAlert({
        message: 'Login successful! Redirecting...'
      })}`;
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`${'An unexpected error occurred. Please try again.'}`;
    }
  }

  /**
   * POST /admin/auth/logout
   * Handle user logout
   */
  async logout(request, reply) {
    try {
      // Clear rate limit for this IP on logout
      const clientIp = request.ip;
      clearRateLimit(loginAttempts, clientIp);

      // Get token from cookie
      const token = request.cookies.token;
      
      if (token) {
        // Delete session from database
        await authService.deleteSession(token);
      }
      
      // Clear cookie
      reply.clearCookie('token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Redirect to login
      reply.header('HX-Redirect', '/admin/auth/login');
      return reply.html`!${successAlert({
        message: 'Logged out successfully'
      })}`;
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'Error during logout'
      })}`;
    }
  }

  /**
   * GET /admin/auth/me
   * Get current user info
   */
  async getCurrentUser(request, reply) {
    try {
      if (!request.user) {
        reply.code(401);
        return { error: 'Not authenticated' };
      }
      
      return {
        user: request.user
      };
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: 'Server error' };
    }
  }

  /**
   * POST /admin/auth/forgot-password
   * Handle password reset request
   */
  async forgotPassword(request, reply) {
    try {
      const { email } = request.body;
      
      // Find user
      const user = await authService.findUserByEmail(email);
      
      // Always return success (don't reveal if email exists)
      if (user) {
        // Create reset token
        const token = await authService.createPasswordResetToken(user.id);
        
        // Password reset email placeholder
        request.log.info(`Password reset token for ${email}: ${token}`);
      }
      
      return reply.html`!${successAlert({
        message: 'If an account exists with this email, you will receive reset instructions.'
      })}`;
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'An error occurred. Please try again.'
      })}`;
    }
  }

  /**
   * POST /admin/auth/reset-password
   * Handle password reset
   */
  async resetPassword(request, reply) {
    try {
      const { token, password } = request.body;
      
      // Validate token
      const resetData = await authService.validatePasswordResetToken(token);
      
      if (!resetData) {
        reply.code(400);
        return reply.html`!${errorAlert({
          message: 'This reset link is invalid or has expired.'
        })}`;
      }
      
      // Reset password
      await authService.resetPassword(resetData.user.id, password);
      
      reply.header('HX-Redirect', '/admin/auth/login?reset=success');
      return reply.html`!${successAlert({
        message: 'Password reset successful. Please login with your new password.'
      })}`;
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'An error occurred. Please try again.'
      })}`;
    }
  }
}

// Export singleton
export const authController = new AuthController();
export default authController;
