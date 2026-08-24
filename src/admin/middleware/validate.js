import { formatZodError } from '../schemas/common.schema.js';
import { errorFragment } from '../render.js';

function isHtmx(request) {
  return request.headers['hx-request'] === 'true';
}

function isApiRequest(request) {
  return request.url.startsWith('/api/');
}

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {string} message
 * @param {{ json?: boolean }} [options]
 */
function failValidation(request, reply, message, options = {}) {
  reply.code(400);

  if (options.json || isApiRequest(request)) {
    return reply.send({ error: message, statusCode: 400 });
  }

  if (request.url.startsWith('/admin/auth/')) {
    return reply.html`${message}`;
  }

  if (isHtmx(request)) {
    return errorFragment(reply, { message });
  }

  return reply.send({ error: message, statusCode: 400 });
}

/**
 * @param {import('zod').ZodSchema} schema
 * @param {{ json?: boolean, onFail?: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, message: string, error: import('zod').ZodError) => unknown }} [options]
 */
export function validateBody(schema, options = {}) {
  return async (request, reply) => {
    const result = schema.safeParse(request.body ?? {});
    if (!result.success) {
      const message = formatZodError(result.error);
      if (options.onFail) {
        return options.onFail(request, reply, message, result.error);
      }
      return failValidation(request, reply, message, options);
    }
    request.body = result.data;
  };
}

/**
 * @param {import('zod').ZodSchema} schema
 * @param {{ json?: boolean }} [options]
 */
export function validateQuery(schema, options = {}) {
  return async (request, reply) => {
    const result = schema.safeParse(request.query ?? {});
    if (!result.success) {
      return failValidation(request, reply, formatZodError(result.error), options);
    }
    request.query = result.data;
  };
}

/**
 * @param {import('zod').ZodSchema} schema
 * @param {{ json?: boolean }} [options]
 */
export function validateParams(schema, options = {}) {
  return async (request, reply) => {
    const result = schema.safeParse(request.params ?? {});
    if (!result.success) {
      return failValidation(request, reply, formatZodError(result.error), options);
    }
    request.params = result.data;
  };
}
