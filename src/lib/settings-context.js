/**
 * Per-request site settings for template formatters (AsyncLocalStorage).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

/**
 * enterWith() mutates "the current context" without properly scoping it to
 * a continuation -- it doesn't reliably survive Fastify's internal
 * onRequest-hook-to-handler dispatch (observed losing the bound settings by
 * the time templates render, verified via the DB query/handler chain this
 * is bound around). run() scopes the store to its callback's continuation
 * instead, so bind by wrapping the hook's done() callback in it.
 *
 * @param {Record<string, unknown>} settings
 * @param {() => void} done - continues the Fastify hook chain inside the scoped context
 */
export function bindRequestSettings(settings, done) {
  storage.run(settings || {}, done);
}

/**
 * @returns {Record<string, unknown>}
 */
export function getRequestSettings() {
  return storage.getStore() || {};
}
