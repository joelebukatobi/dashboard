import fastifyHtml from 'fastify-html';
import { buildDashboardShell } from './templates/layouts/main.js';
import { resolvePageMeta, renderOgMetaTags } from '../lib/site-meta.js';
import { buildPageManifest, buildProjectManifest } from './routes/manifest.js';
import { projectPagePrefixes } from './routes/project/prefixes.js';

/**
 * Encapsulated admin dashboard plugin.
 * Registers fastify-html layout for authenticated /admin/* routes.
 */
export default async function adminPlugin(fastify) {
  await fastify.register(fastifyHtml);

  fastify.addLayout((inner, reply) => {
    const pageMeta = reply.request.templateMeta ?? {};
    const siteMap = reply.request.siteSettingsMap ?? {};
    const siteName = String(siteMap.siteName || 'BlogCMS');
    const siteIcon = String(siteMap.siteIcon || '');
    const siteUrl = String(siteMap.siteUrl || '/').trim() || '/';
    // Always point at the route, never at the stored path. /favicon.svg
    // resolves the configured icon and falls back to the bundled one when
    // that file is missing (src/app.js sendFavicon) — embedding the raw
    // siteIcon here bypassed that, so a stale setting meant no favicon at all.
    const favicon = '/favicon.svg';
    const resolved = resolvePageMeta(siteMap, {
      title: pageMeta.title,
      description: pageMeta.description,
      path: reply.request.url,
    });

    return buildDashboardShell({
      title: pageMeta.title ?? 'Dashboard',
      description: resolved.description || pageMeta.description || 'BlogCMS Dashboard',
      content: inner,
      user: reply.request.user,
      activeRoute: pageMeta.activeRoute ?? '/admin',
      breadcrumbs: pageMeta.breadcrumbs ?? [],
      modals: pageMeta.modals ?? '',
      siteName,
      siteIcon,
      siteUrl,
      favicon,
      ogMeta: renderOgMetaTags(resolved),
    });
  }, { skipOnHeader: 'hx-request' });

  // Core admin pages, autoloaded from src/admin/routes/*.routes.js.
  for (const route of buildPageManifest(projectPagePrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }

  // Fork-owned admin pages, autoloaded from src/admin/routes/project/.
  for (const route of buildProjectManifest(projectPagePrefixes)) {
    await fastify.register(import(route.url), { prefix: route.prefix });
  }
}
