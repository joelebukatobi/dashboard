// src/admin/routes/api/subscribers.routes.js
// Public API routes for newsletter subscribers

import { subscribersAPIController } from '../../controllers/api/subscribers.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { subscribeSchema } from '../../schemas/api.schema.js';
import { subscribeModal } from '../../templates/partials/subscribe-modal.js';

function subscribeValidationFail(request, reply, message) {
  reply.code(400);
  const isHtmx = request.headers['hx-request'] === 'true';
  const isMissing = message.toLowerCase().includes('required');
  const title = isMissing ? 'Missing Email' : 'Invalid Email';
  const friendlyMessage = isMissing
    ? 'Please provide a valid email address.'
    : 'Please enter a valid email address.';

  if (isHtmx) {
    return reply.html`!${subscribeModal({
      type: 'error',
      title,
      message: friendlyMessage,
    })}`;
  }

  return reply.send({ error: isMissing ? 'Email is required' : 'Invalid email address' });
}

export default async function subscribersApiRoutes(fastify, opts) {
  fastify.post('/subscribe', {
    preHandler: validateBody(subscribeSchema, {
      onFail: (request, reply, message) => subscribeValidationFail(request, reply, message),
    }),
    handler: subscribersAPIController.subscribe.bind(subscribersAPIController),
  });

  fastify.get('/count', {
    handler: subscribersAPIController.count.bind(subscribersAPIController),
  });
}
