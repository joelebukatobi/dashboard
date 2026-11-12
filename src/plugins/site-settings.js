/**
 * Site settings plugin — cached settings map on fastify instance.
 */

import fp from 'fastify-plugin';
import { settingsService } from '../services/settings.service.js';
import { bindRequestSettings } from '../lib/settings-context.js';

const CACHE_TTL_MS = 60_000;

async function siteSettingsPlugin(fastify) {
  /** @type {{ map: Record<string, unknown> | null, expiresAt: number }} */
  let cache = { map: null, expiresAt: 0 };

  async function loadMap() {
    if (cache.map && Date.now() < cache.expiresAt) {
      return cache.map;
    }
    const map = await settingsService.getSettingsMap();
    cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
    return map;
  }

  function invalidate() {
    cache = { map: null, expiresAt: 0 };
  }

  fastify.decorate('siteSettings', {
    getMap: loadMap,
    getPublic: async () => settingsService.getPublicSettings(await loadMap()),
    invalidate,
  });

  // Callback-style hook (not async) so bindRequestSettings can wrap the
  // done() call in storage.run() -- that's what scopes the AsyncLocalStorage
  // context to the rest of the request's dispatch chain. An async hook here
  // would bind via enterWith() instead, which doesn't reliably survive
  // Fastify's internal hook-to-handler dispatch.
  fastify.addHook('onRequest', (request, reply, done) => {
    loadMap()
      .then((map) => {
        request.siteSettingsMap = map;
        bindRequestSettings(map, done);
      })
      .catch(done);
  });

  fastify.addHook('onReady', async () => {
    await loadMap();
  });
}

export default fp(siteSettingsPlugin, { name: 'site-settings' });
