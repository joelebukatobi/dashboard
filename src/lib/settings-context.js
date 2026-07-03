/**
 * Per-request site settings for template formatters (AsyncLocalStorage).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

/**
 * @param {Record<string, unknown>} settings
 */
export function bindRequestSettings(settings) {
  storage.enterWith(settings || {});
}

/**
 * @returns {Record<string, unknown>}
 */
export function getRequestSettings() {
  return storage.getStore() || {};
}
