// src/admin/controllers/auth.controller.js
import { authService } from '../../services/auth.service.js';
import { validate, loginSchema } from '../../utils/validators.js';
import { validatePasswordStrength, checkRateLimit, clearRateLimit } from '../../utils/security.js';

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
        return reply.type('text/html').send(errorToast({
          message: 'Too many login attempts. Please try again in 15 minutes.'
        }));
      }
      
      // Validate request body
      const validation = validate(loginSchema, request.body);
      if (!validation.success) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: validation.errors.join(', ')
        }));
      }
      
      const { email, password, rememberMe } = validation.data;
      
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
        return reply.type('text/html').send(message);
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
      return reply.type('text/html').send(successToast({
        message: 'Login successful! Redirecting...'
      }));
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'An unexpected error occurred. Please try again.'
      }));
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
      return reply.type('text/html').send(successToast({
        message: 'Logged out successfully'
      }));
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Error during logout'
      }));
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
      
      if (!email) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Email is required'
        }));
      }
      
      // Find user
      const user = await authService.findUserByEmail(email);
      
      // Always return success (don't reveal if email exists)
      if (user) {
        // Create reset token
        const token = await authService.createPasswordResetToken(user.id);
        
        // TODO: Send email with reset link
        // In development, just log it
        request.log.info(`Password reset token for ${email}: ${token}`);
      }
      
      return reply.type('text/html').send(successToast({
        message: 'If an account exists with this email, you will receive reset instructions.'
      }));
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'An error occurred. Please try again.'
      }));
    }
  }

  /**
   * POST /admin/auth/reset-password
   * Handle password reset
   */
  async resetPassword(request, reply) {
    try {
      const { token, password, confirmPassword } = request.body;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Passwords do not match'
        }));
      }
      
      // Validate password strength
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: passwordCheck.errors.join('. ')
        }));
      }
      
      // Validate token
      const resetData = await authService.validatePasswordResetToken(token);
      
      if (!resetData) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'This reset link is invalid or has expired.'
        }));
      }
      
      // Reset password
      await authService.resetPassword(resetData.user.id, password);
      
      reply.header('HX-Redirect', '/admin/auth/login?reset=success');
      return reply.type('text/html').send(successToast({
        message: 'Password reset successful. Please login with your new password.'
      }));
      
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'An error occurred. Please try again.'
      }));
    }
  }
}

// Helper functions for HTMX responses
function errorToast({ message }) {
  return message;
}

function successToast({ message }) {
  return `
    <div class="alert alert--success alert--mb" role="alert">
      <i data-lucide="check-circle" class="alert__icon"></i>
      <span class="alert__message">${message}</span>
    </div>
  `;
}

// Export singleton
export const authController = new AuthController();
export default authController;
