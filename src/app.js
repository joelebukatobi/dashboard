import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyHtml from 'fastify-html';
import path from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { checkSetupStatus } from './middleware/setup-check.js';
import { ensureDatabaseUrl } from '../env.js';
import { getAppSecret } from './lib/app-secrets.js';
import { buildApiManifest } from './admin/routes/manifest.js';
import { projectApiPrefixes } from './admin/routes/project/prefixes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

// Load environment variables (process.env, .env.local, .env.development, .env, cPanel)
ensureDatabaseUrl({ scriptName: 'server', exitOnError: false });

export default async function app(fastify, opts) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Register security plugins (skip in development to avoid HTTPS/CSP issues)
  if (!isDevelopment) {
    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          // Helmet defaults script-src-attr to 'none', which blocks inline
          // event handler attributes. 'unsafe-inline' on script-src permits
          // inline <script> blocks but not onclick= and friends — a separate
          // directive governs those. The admin templates use ~94 inline
          // handlers, so without this every one of them silently does
          // nothing in production while working fine in development.
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        },
      },
      strictTransportSecurity: {
        maxAge: 15552000,
        includeSubDomains: true,
      },
    });
  }

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyFormbody);
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 20,
    }
  });
  // CORS - disabled in development, configured for production
  if (!isDevelopment) {
    await fastify.register(fastifyCors, {
      origin: true,
      credentials: true,
    });
  }

  await fastify.register(fastifyJwt, {
    secret: getAppSecret(),
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Rate limiting - disabled in development, enabled in production
  if (!isDevelopment) {
    await fastify.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  // Register fastify-html for templating
  await fastify.register(fastifyHtml);

  // Register setup check middleware (runs on all routes)
  await checkSetupStatus(fastify);

  // Register setup routes FIRST (must be available before setup is complete)
  await fastify.register(import('./admin/routes/setup.routes.js'));

  // Register static file serving for public uploads
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/',
    decorateReply: false,
  });

  // Serve uploads directory (user avatars, media files)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public', 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Serve dist/ directory (compiled CSS/JS)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../dist'),
    prefix: '/dist/',
    decorateReply: false,
  });

  // Site settings (cached; used by API, layouts, auth)
  await fastify.register(import('./plugins/site-settings.js'));

  const MIME_BY_EXT = {
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  function resolveSiteIconFsPath(siteIcon) {
    if (!siteIcon || siteIcon === '/favicon.svg') return null;
    const rel = siteIcon.startsWith('/public/')
      ? siteIcon.slice('/public/'.length)
      : siteIcon.replace(/^\//, '');
    return path.join(PUBLIC_DIR, rel);
  }

  async function sendFavicon(request, reply, fallbackFile) {
    const map = request.siteSettingsMap ?? await fastify.siteSettings.getMap();
    const customPath = resolveSiteIconFsPath(String(map.siteIcon || ''));
    if (customPath) {
      try {
        const data = await readFile(customPath);
        const ext = path.extname(customPath).toLowerCase();
        return reply.type(MIME_BY_EXT[ext] || 'application/octet-stream').send(data);
      } catch {
        // fall through to default
      }
    }
    const data = await readFile(path.join(PUBLIC_DIR, fallbackFile));
    const type = fallbackFile.endsWith('.ico') ? 'image/x-icon' : 'image/svg+xml';
    return reply.type(type).send(data);
  }

  fastify.get('/favicon.svg', (request, reply) => sendFavicon(request, reply, 'favicon.svg'));
  fastify.get('/favicon.ico', (request, reply) => sendFavicon(request, reply, 'favicon.ico'));

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  });

   // Register admin routes (fastify-html layouts scoped per plugin)
   await fastify.register(import('./admin/auth-plugin.js'));
   await fastify.register(import('./admin/plugin.js'));

  // Public API routes (v1), autoloaded from src/admin/routes/api/*.routes.js.
  for (const route of buildApiManifest(projectApiPrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }

  // Register public app routes (fastify-html layout scoped per plugin)
  await fastify.register(import('./app/plugin.js'));

  // 404 handler
  fastify.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return {
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
      statusCode: 404,
    };
  });
}
