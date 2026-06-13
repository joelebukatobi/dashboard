/**
 * Public app view-layer helpers for fastify-html.
 */

/**
 * @typedef {Object} AppTemplateMeta
 * @property {string} [title]
 * @property {'app'|'blog'|'coming-soon'|'error'} [layout]
 * @property {boolean} [activeBlogNav]
 * @property {string} [footer]
 */

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {AppTemplateMeta} meta
 */
export function setTemplateMeta(request, meta) {
  request.templateMeta = meta;
}

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {AppTemplateMeta} meta
 * @param {string} html
 */
export function renderAppPage(request, reply, meta, html) {
  setTemplateMeta(request, meta);
  return reply.html`!${html}`;
}

/**
 * @param {import('fastify').FastifyReply} reply
 * @param {string} html
 */
export function renderAppFragment(reply, html) {
  return reply.html`!${html}`;
}

/**
 * Render coming-soon page (setup middleware — no layout meta on request).
 * @param {import('fastify').FastifyReply} reply
 * @param {string} html
 */
export function renderComingSoonPage(reply, html) {
  return reply.html`!${html}`;
}
