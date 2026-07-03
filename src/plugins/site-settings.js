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

  fastify.addHook('onRequest', async (request) => {
    const map = await loadMap();
    request.siteSettingsMap = map;
    bindRequestSettings(map);
  });

  fastify.addHook('onReady', async () => {
    await loadMap();
  });
}

export default fp(siteSettingsPlugin, { name: 'site-settings' });
