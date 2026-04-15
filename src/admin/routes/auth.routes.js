// src/admin/routes/auth.routes.js
import { authController } from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';
import { loginPage } from '../templates/pages/login.js';
import { resetPasswordPage } from '../templates/pages/reset-password.js';

/**
 * Authentication Routes
 * Defines all auth-related endpoints
 */
export default async function authRoutes(fastify) {
  
  // POST /admin/auth/login
  // Public - no auth required
  fastify.post('/login', {
    handler: authController.login.bind(authController)
  });
  
  // GET /admin/auth/login
  // Serve login page (HTML)
  fastify.get('/login', {
    handler: async (request, reply) => {
      // If already logged in, redirect to dashboard
      const token = request.cookies.token;
      if (token) {
        try {
          await request.jwtVerify(token);
          return reply.redirect('/admin');
        } catch {
          // Token invalid, show login page
        }
      }
      
      // Get any error or success message from query params
      const { error, reset, setup } = request.query;
      let success = '';
      
      if (reset === 'success') {
        success = 'Password reset successfully. Please sign in.';
      } else if (setup === 'success') {
        success = 'Setup complete! Your admin account has been created. Please sign in.';
      }
      
      // Serve login page
      return reply.type('text/html').send(loginPage({ error, success }));
    }
  });
  
  // POST /admin/auth/logout
  // Protected - requires auth
  fastify.post('/logout', {
    preHandler: authenticate,
    handler: authController.logout.bind(authController)
  });
  
  // GET /admin/auth/me
  // Protected - get current user
  fastify.get('/me', {
    preHandler: authenticate,
    handler: authController.getCurrentUser.bind(authController)
  });
  
  // POST /admin/auth/forgot-password
  // Public - request password reset
  fastify.post('/forgot-password', {
    handler: authController.forgotPassword.bind(authController)
  });
  
  // POST /admin/auth/reset-password
  // Public - reset password with token
  fastify.post('/reset-password', {
    handler: authController.resetPassword.bind(authController)
  });
  
  // GET /admin/auth/reset-password
  // Serve reset password page (HTML)
  fastify.get('/reset-password', {
    handler: async (request, reply) => {
      const { token, error } = request.query;
      
      if (!token) {
        return reply.redirect('/admin/auth/login');
      }
      
      // Serve reset password page
      return reply.type('text/html').send(resetPasswordPage({ token, error }));
    }
  });
}
