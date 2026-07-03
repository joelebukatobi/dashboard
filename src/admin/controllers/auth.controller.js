// src/admin/controllers/auth.controller.js
import { authService } from '../../services/auth.service.js';
import { checkRateLimit, clearRateLimit, validatePasswordStrength } from '../../utils/security.js';
import { verifyTotpCode } from '../../services/totp.service.js';
import { getRequestSettings } from '../../lib/settings-context.js';
import { getLoginTotpAction, isUserTotpEnabled } from '../../lib/user-totp.js';
import { usersService } from '../../services/users.service.js';
import { errorAlert, successAlert, htmxRedirect, renderAdminPage } from '../render.js';
import {
  loginPanelContent,
  totpPageContent,
  totpMeta,
  totpSetupPageContent,
  totpSetupMeta,
} from '../templates/pages/login.js';

// In-memory rate limit store (use Redis in production)
const loginAttempts = new Map();

const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const TOTP_ERROR_MESSAGES = {
  expired: 'Session expired. Please sign in again.',
  invalid: 'Invalid authentication code. Try again.',
  unavailable: 'Two-factor authentication is not enabled for this account.',
  session: 'Invalid verification session.',
};

function totpErrorMessage(code) {
  return TOTP_ERROR_MESSAGES[code] || 'Unable to verify your code. Please try again.';
}

const TOTP_SETUP_ERROR_MESSAGES = {
  expired: 'Session expired. Please sign in again.',
  invalid: 'Invalid verification code. Try again.',
  session: 'Invalid setup session.',
};

function totpSetupErrorMessage(code) {
  return TOTP_SETUP_ERROR_MESSAGES[code] || 'Unable to complete setup. Please try again.';
}

function redirectToTotpSetup(reply, errorCode = null) {
  const query = errorCode ? `?error=${encodeURIComponent(errorCode)}` : '';
  return reply.redirect(`/admin/auth/totp-setup${query}`);
}

function redirectToTotp(reply, errorCode = null) {
  const query = errorCode ? `?error=${encodeURIComponent(errorCode)}` : '';
  return reply.redirect(`/admin/auth/totp${query}`);
}

/**
 * Auth Controller
 * Handles authentication HTTP requests
 */
class AuthController {
  /**
   * Complete login after password (and optional TOTP) verification.
   */
  async completeLogin(request, reply, user, rememberMe) {
    await authService.updateLastActive(user.id);

    const token = await reply.jwtSign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: rememberMe ? '30d' : '24h' },
    );

    await authService.createSession(user.id, rememberMe, token);

    reply.setCookie('token', token, {
      ...cookieOptions,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    });
    reply.clearCookie('totp_pending', cookieOptions);
    reply.clearCookie('totp_setup_pending', cookieOptions);

    if (request.headers['hx-request']) {
      reply.header('HX-Redirect', '/admin');
      return reply.html`!${successAlert({
        message: 'Login successful! Redirecting...',
      })}`;
    }

    return reply.redirect('/admin');
  }

  /**
   * POST /admin/auth/login
   */
  async login(request, reply) {
    try {
      const clientIp = request.ip;
      const rateLimit = checkRateLimit(loginAttempts, clientIp, 5, 15 * 60 * 1000);
      if (rateLimit.blocked) {
        reply.code(429);
        return reply.html`${'Too many login attempts. Please try again in 15 minutes.'}`;
      }

      const { email, password, rememberMe } = request.body;
      const result = await authService.validateCredentials(email, password);

      if (!result.valid) {
        const errorMessages = {
          INVALID_EMAIL_FORMAT: 'Invalid email format',
          PASSWORD_REQUIRED: 'Password is required',
          EMAIL_NOT_FOUND: 'Email not found',
          WRONG_PASSWORD: 'Wrong password',
          ACCOUNT_SUSPENDED: 'Account suspended',
          ACCOUNT_NOT_ACTIVATED: 'Account not activated',
        };

        const message = errorMessages[result.errorType] || 'Invalid credentials';
        return reply.html`!${loginPanelContent({
          error: message,
          email,
          rememberMe: rememberMe === true || rememberMe === 'true',
        })}`;
      }

      clearRateLimit(loginAttempts, clientIp);

      const siteMap = request.siteSettingsMap ?? {};
      const userRecord = await authService.findUserByEmail(email);
      const totpAction = getLoginTotpAction(userRecord, siteMap);

      if (totpAction === 'verify') {
        const pendingToken = await reply.jwtSign(
          { userId: result.user.id, rememberMe, stage: 'totp' },
          { expiresIn: '5m' },
        );

        reply.setCookie('totp_pending', pendingToken, {
          ...cookieOptions,
          maxAge: 5 * 60 * 1000,
        });

        if (request.headers['hx-request']) {
          return htmxRedirect(reply, '/admin/auth/totp');
        }
        return reply.redirect('/admin/auth/totp');
      }

      if (totpAction === 'setup') {
        const pendingToken = await reply.jwtSign(
          { userId: result.user.id, rememberMe, stage: 'totp_setup' },
          { expiresIn: '15m' },
        );

        reply.setCookie('totp_setup_pending', pendingToken, {
          ...cookieOptions,
          maxAge: 15 * 60 * 1000,
        });

        if (request.headers['hx-request']) {
          return htmxRedirect(reply, '/admin/auth/totp-setup');
        }
        return reply.redirect('/admin/auth/totp-setup');
      }

      return this.completeLogin(request, reply, result.user, rememberMe);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`${'An unexpected error occurred. Please try again.'}`;
    }
  }

  /**
   * GET /admin/auth/totp
   */
  async showTotpPage(request, reply) {
    const pending = request.cookies.totp_pending;
    if (!pending) {
      return reply.redirect('/admin/auth/login');
    }

    try {
      const decoded = request.server.jwt.verify(pending);
      if (!decoded?.userId || decoded.stage !== 'totp') {
        throw new Error('Invalid session');
      }
    } catch {
      reply.clearCookie('totp_pending', cookieOptions);
      return reply.redirect('/admin/auth/login');
    }

    const error = request.query.error ? totpErrorMessage(request.query.error) : '';
    return renderAdminPage(
      request,
      reply,
      totpMeta(),
      totpPageContent({ error }),
    );
  }

  /**
   * POST /admin/auth/verify-totp
   */
  async verifyTotp(request, reply) {
    try {
      const pending = request.cookies.totp_pending;
      if (!pending) {
        return redirectToTotp(reply, 'expired');
      }

      let decoded;
      try {
        decoded = request.server.jwt.verify(pending);
      } catch {
        reply.clearCookie('totp_pending', cookieOptions);
        return redirectToTotp(reply, 'expired');
      }

      if (!decoded?.userId || decoded.stage !== 'totp') {
        return redirectToTotp(reply, 'session');
      }

      const { code } = request.body;
      const creds = await authService.getUserTotpCredentials(decoded.userId);
      if (!creds?.totpSecret || !isUserTotpEnabled(creds.totpEnabled)) {
        return redirectToTotp(reply, 'unavailable');
      }

      if (!(await verifyTotpCode(code, creds.totpSecret))) {
        return redirectToTotp(reply, 'invalid');
      }

      const user = await authService.findUserById(decoded.userId);
      if (!user) {
        return redirectToTotp(reply, 'session');
      }

      const { password: _, totpSecret: __, ...userSafe } = user;
      return this.completeLogin(request, reply, userSafe, decoded.rememberMe);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return redirectToTotp(reply, 'session');
    }
  }

  /**
   * Decode a pending login cookie for TOTP flows.
   * @param {import('fastify').FastifyRequest} request
   * @param {string} cookieName
   * @param {string} expectedStage
   */
  decodePendingLogin(request, cookieName, expectedStage) {
    const pending = request.cookies[cookieName];
    if (!pending) return null;

    try {
      const decoded = request.server.jwt.verify(pending);
      if (!decoded?.userId || decoded.stage !== expectedStage) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * GET /admin/auth/totp-setup
   * Mandatory admin 2FA enrollment before dashboard access.
   */
  async showTotpSetupPage(request, reply) {
    const decoded = this.decodePendingLogin(request, 'totp_setup_pending', 'totp_setup');
    if (!decoded) {
      reply.clearCookie('totp_setup_pending', cookieOptions);
      return reply.redirect('/admin/auth/login');
    }

    try {
      const user = await authService.findUserById(decoded.userId);
      if (!user) {
        reply.clearCookie('totp_setup_pending', cookieOptions);
        return reply.redirect('/admin/auth/login');
      }

      const siteMap = request.siteSettingsMap ?? {};
      const siteName = String(siteMap.siteName || 'Dashboard');
      const reset = request.query?.reset === 'true';
      const { qrDataUrl } = await usersService.resumeOrStartTotpEnrollment(user.id, {
        email: user.email,
        siteName,
        reset,
      });

      const error = request.query.error ? totpSetupErrorMessage(request.query.error) : '';
      return renderAdminPage(
        request,
        reply,
        totpSetupMeta(),
        totpSetupPageContent({ qrDataUrl, error }),
      );
    } catch (error) {
      request.log.error(error);
      reply.clearCookie('totp_setup_pending', cookieOptions);
      return reply.redirect('/admin/auth/login');
    }
  }

  /**
   * POST /admin/auth/totp-setup/verify
   */
  async verifyTotpSetup(request, reply) {
    try {
      const decoded = this.decodePendingLogin(request, 'totp_setup_pending', 'totp_setup');
      if (!decoded) {
        reply.clearCookie('totp_setup_pending', cookieOptions);
        return redirectToTotpSetup(reply, 'expired');
      }

      const { code } = request.body;
      await usersService.confirmTotpEnrollment(decoded.userId, code);

      const user = await authService.findUserById(decoded.userId);
      if (!user) {
        return redirectToTotpSetup(reply, 'session');
      }

      const { password: _, totpSecret: __, ...userSafe } = user;
      return this.completeLogin(request, reply, userSafe, decoded.rememberMe);
    } catch (error) {
      request.log.error(error);
      if (error.message === 'Invalid verification code') {
        return redirectToTotpSetup(reply, 'invalid');
      }
      return redirectToTotpSetup(reply, 'session');
    }
  }

  /**
   * POST /admin/auth/logout
   */
  async logout(request, reply) {
    try {
      const clientIp = request.ip;
      clearRateLimit(loginAttempts, clientIp);

      const token = request.cookies.token;
      if (token) {
        await authService.deleteSession(token);
      }

      reply.clearCookie('token', cookieOptions);
      reply.clearCookie('totp_pending', cookieOptions);
      reply.clearCookie('totp_setup_pending', cookieOptions);

      reply.header('HX-Redirect', '/admin/auth/login');
      return reply.html`!${successAlert({
        message: 'Logged out successfully',
      })}`;
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'Error during logout',
      })}`;
    }
  }

  /**
   * GET /admin/auth/me
   */
  async getCurrentUser(request, reply) {
    try {
      if (!request.user) {
        reply.code(401);
        return { error: 'Not authenticated' };
      }

      return { user: request.user };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: 'Server error' };
    }
  }

  /**
   * POST /admin/auth/forgot-password
   */
  async forgotPassword(request, reply) {
    try {
      const { email } = request.body;
      const user = await authService.findUserByEmail(email);

      if (user) {
        const token = await authService.createPasswordResetToken(user.id);
        request.log.info(`Password reset token for ${email}: ${token}`);
      }

      return reply.html`!${successAlert({
        message: 'If an account exists with this email, you will receive reset instructions.',
      })}`;
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'An error occurred. Please try again.',
      })}`;
    }
  }

  /**
   * POST /admin/auth/reset-password
   */
  async resetPassword(request, reply) {
    try {
      const { token, password } = request.body;
      const resetData = await authService.validatePasswordResetToken(token);

      if (!resetData) {
        reply.code(400);
        return reply.html`!${errorAlert({
          message: 'This reset link is invalid or has expired.',
        })}`;
      }

      const requireStrong = getRequestSettings().requireStrongPasswords !== false;
      const strength = validatePasswordStrength(password, { requireStrong });
      if (!strength.valid) {
        reply.code(400);
        return reply.html`!${errorAlert({
          message: strength.errors.join('. '),
        })}`;
      }

      await authService.resetPassword(resetData.user.id, password);

      reply.header('HX-Redirect', '/admin/auth/login?reset=success');
      return reply.html`!${successAlert({
        message: 'Password reset successful. Please login with your new password.',
      })}`;
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.html`!${errorAlert({
        message: 'An error occurred. Please try again.',
      })}`;
    }
  }
}

export const authController = new AuthController();
export default authController;
