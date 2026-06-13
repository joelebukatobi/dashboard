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
            'https://cdn.tailwindcss.com',
            'https://unpkg.com',
            'https://fonts.googleapis.com',
          ],
          scriptSrc: ["'self'", 'https://unpkg.com', 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
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
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
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

  // Serve node_modules/htmx.org for HTMX
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/htmx.org/dist'),
    prefix: '/vendor/htmx/',
    decorateReply: false,
  });

  // Serve node_modules/preline/dist for Preline JS
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/preline/dist'),
    prefix: '/vendor/preline/',
    decorateReply: false,
  });

  // Serve ApexCharts
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../node_modules/apexcharts/dist'),
    prefix: '/vendor/apexcharts/',
    decorateReply: false,
  });

  fastify.get('/favicon.svg', async (_request, reply) => {
    const data = await readFile(path.join(PUBLIC_DIR, 'favicon.svg'));
    return reply.type('image/svg+xml').send(data);
  });

  fastify.get('/favicon.ico', async (_request, reply) => {
    const data = await readFile(path.join(PUBLIC_DIR, 'favicon.ico'));
    return reply.type('image/x-icon').send(data);
  });

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

  // Register public API routes (v1)
  await fastify.register(import('./admin/routes/api/posts.routes.js'), { prefix: '/api/v1/posts' });
  await fastify.register(import('./admin/routes/api/categories.routes.js'), { prefix: '/api/v1/categories' });
  await fastify.register(import('./admin/routes/api/tags.routes.js'), { prefix: '/api/v1/tags' });
  await fastify.register(import('./admin/routes/api/comments.routes.js'), { prefix: '/api/v1' });
   await fastify.register(import('./admin/routes/api/images.routes.js'), { prefix: '/api/v1/images' });
   await fastify.register(import('./admin/routes/api/videos.routes.js'), { prefix: '/api/v1/videos' });
   await fastify.register(import('./admin/routes/api/subscribers.routes.js'), { prefix: '/api/v1' });

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
