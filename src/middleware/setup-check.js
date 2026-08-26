// src/middleware/setup-check.js
// Detects if the application needs setup (no users exist)
// Redirects to "Coming Soon" page or setup wizard as appropriate

import { sql } from 'drizzle-orm';
import { buildComingSoonShell } from '../app/templates/layouts/app.js';
import { comingSoonContent } from '../admin/templates/pages/coming-soon.js';

export async function checkSetupStatus(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    const pathname = request.url.split('?')[0];

    // Skip check for static assets and API routes
    if (pathname.startsWith('/dist/') ||
        pathname.startsWith('/vendor/') ||
        pathname.startsWith('/public/') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/health') ||
        pathname.startsWith('/admin/auth/') ||
        pathname === '/favicon.ico' ||
        pathname === '/favicon.svg') {
      return;
    }

    // Skip check for setup routes themselves
    if (pathname.startsWith('/setup')) {
      return;
    }

    try {
      const { db, users } = await import('../db/index.js');
      
      // Check if any users exist
      const [result] = await db.select({ count: sql`count(*)` }).from(users);
      const userCount = Number(result.count);

      if (userCount === 0) {
        // No admin configured - show coming soon page for homepage
        if (pathname === '/' || pathname === '') {
          return reply.html`!${buildComingSoonShell({ content: comingSoonContent() })}`;
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
