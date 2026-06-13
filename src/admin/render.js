/**
 * Admin view-layer helpers for fastify-html.
 */

import { escapeHtml } from './templates/utils/helpers.js';

/**
 * @typedef {Object} TemplateMeta
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [activeRoute]
 * @property {Array<{ label: string, url?: string, href?: string }>} [breadcrumbs]
 * @property {string} [modals]
 */

/**
 * Set page metadata consumed by addLayout().
 * @param {import('fastify').FastifyRequest} request
 * @param {TemplateMeta} meta
 */
export function setTemplateMeta(request, meta) {
  request.templateMeta = meta;
}

/**
 * Render a full admin page (layout applied via addLayout).
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {TemplateMeta} meta
 * @param {string} html
 */
export function renderAdminPage(request, reply, meta, html) {
  setTemplateMeta(request, meta);
  return reply.html`!${html}`;
}

/**
 * Render an HTMX fragment (layout skipped via hx-request header).
 * @param {import('fastify').FastifyReply} reply
 * @param {string} html
 */
export function renderFragment(reply, html) {
  return reply.html`!${html}`;
}

/**
 * Render an empty HTMX response.
 * @param {import('fastify').FastifyReply} reply
 */
export function renderEmpty(reply) {
  return reply.html``;
}

/**
 * Inline form error alert (HTMX target fragments).
 * @param {{ message: string }} options
 * @returns {string}
 */
export function errorAlert({ message }) {
  return `
    <div class="alert alert--error alert--mb" role="alert">
      <i data-lucide="alert-circle" class="alert__icon"></i>
      <span class="alert__message">${escapeHtml(message)}</span>
    </div>
  `;
}

/**
 * Inline form success alert (HTMX target fragments).
 * @param {{ message: string }} options
 * @returns {string}
 */
export function successAlert({ message }) {
  return `
    <div class="alert alert--success alert--mb" role="alert">
      <i data-lucide="check-circle" class="alert__icon"></i>
      <span class="alert__message">${escapeHtml(message)}</span>
    </div>
  `;
}

/**
 * Set HX-Trigger with an htmx:toast event.
 * @param {import('fastify').FastifyReply} reply
 * @param {{ message: string, type?: string }} toast
 * @returns {import('fastify').FastifyReply}
 */
export function setHtmxToast(reply, { message, type = 'success' }) {
  reply.header('HX-Trigger', JSON.stringify({
    'htmx:toast': { message, type },
  }));
  return reply;
}

/**
 * Set a multi-key HX-Trigger header.
 * @param {import('fastify').FastifyReply} reply
 * @param {Record<string, unknown>} triggers
 * @returns {import('fastify').FastifyReply}
 */
export function setHtmxTrigger(reply, triggers) {
  reply.header('HX-Trigger', JSON.stringify(triggers));
  return reply;
}

/**
 * HTMX redirect with an empty body.
 * @param {import('fastify').FastifyReply} reply
 * @param {string} url
 */
export function htmxRedirect(reply, url) {
  reply.header('HX-Redirect', url);
  return renderEmpty(reply);
}

/**
 * HTMX client-side navigation with optional toast.
 * @param {import('fastify').FastifyReply} reply
 * @param {string} url
 * @param {{ message: string, type?: string }|undefined} toast
 */
export function htmxLocation(reply, url, toast) {
  reply.header('HX-Location', url);
  if (toast) {
    setHtmxToast(reply, toast);
  }
  return renderEmpty(reply);
}
