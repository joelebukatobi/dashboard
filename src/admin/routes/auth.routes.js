// src/admin/routes/auth.routes.js
import { authController } from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';
import { loginContent, loginMeta } from '../templates/pages/login.js';
import { resetPasswordContent, resetPasswordMeta } from '../templates/pages/reset-password.js';
import { renderAdminPage } from '../render.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../../utils/validators.js';
import { forgotPasswordSchema, resetPasswordSchema, verifyTotpSchema } from '../schemas/auth.schema.js';
import { errorAlert } from '../render.js';

function authFormValidationFail(request, reply, message) {
  reply.code(400);
  return reply.html`!${errorAlert({ message })}`;
}

export default async function authRoutes(fastify) {
  fastify.post('/login', {
    preHandler: validateBody(loginSchema),
    handler: authController.login.bind(authController),
  });

  fastify.post('/verify-totp', {
    preHandler: validateBody(verifyTotpSchema),
    handler: authController.verifyTotp.bind(authController),
  });

  fastify.get('/totp', {
    handler: authController.showTotpPage.bind(authController),
  });

  fastify.get('/totp-setup', {
    handler: authController.showTotpSetupPage.bind(authController),
  });

  fastify.post('/totp-setup/verify', {
    preHandler: validateBody(verifyTotpSchema),
    handler: authController.verifyTotpSetup.bind(authController),
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
      
      return renderAdminPage(request, reply, loginMeta({}), loginContent());
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
    preHandler: validateBody(forgotPasswordSchema, { onFail: authFormValidationFail }),
    handler: authController.forgotPassword.bind(authController),
  });
  
  // POST /admin/auth/reset-password
  // Public - reset password with token
  fastify.post('/reset-password', {
    preHandler: validateBody(resetPasswordSchema, { onFail: authFormValidationFail }),
    handler: authController.resetPassword.bind(authController),
  });
  
  // GET /admin/auth/reset-password
  // Serve reset password page (HTML)
  fastify.get('/reset-password', {
    handler: async (request, reply) => {
      const { token, error } = request.query;
      
      if (!token) {
        return reply.redirect('/admin/auth/login');
      }
      
      return renderAdminPage(request, reply, resetPasswordMeta({}), resetPasswordContent({ token, error }));
    }
  });
}
