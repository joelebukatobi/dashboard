// src/middleware/setup-check.js
// Detects if the application needs setup (no users exist)
// Redirects to "Coming Soon" page or setup wizard as appropriate

import { sql } from 'drizzle-orm';
import comingSoon from '../admin/templates/pages/coming-soon.js';

export async function checkSetupStatus(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip check for static assets and API routes
    if (request.url.startsWith('/dist/') || 
        request.url.startsWith('/vendor/') ||
        request.url.startsWith('/public/') ||
        request.url.startsWith('/api/')) {
      return;
    }

    // Skip check for setup routes themselves
    if (request.url.startsWith('/setup')) {
      return;
    }

    try {
      const { db, users } = await import('../db/index.js');
      
      // Check if any users exist
      const [result] = await db.select({ count: sql`count(*)` }).from(users);
      const userCount = Number(result.count);

      if (userCount === 0) {
        // No admin configured - show coming soon page for homepage
        if (request.url === '/' || request.url === '') {
          return reply.type('text/html').send(comingSoon());
        }
        // All other routes redirect to homepage
        return reply.redirect('/');
      }
    } catch (error) {
      // If DB error, let it propagate to error handler
      fastify.log.error('Setup check error:', error);
      throw error;
    }
  });
}
