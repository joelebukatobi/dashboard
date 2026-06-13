// src/admin/routes/api/subscribers.routes.js
// Public API routes for newsletter subscribers

import { subscribersService } from '../../../services/subscribers.service.js';

function subscribeModal({ type, title, message }) {
  const icon = type === 'success' ? 'ph ph-check-circle' : 'ph ph-warning-circle';
  return `
    <div class="newsletter-modal" id="newsletterModal" role="dialog" aria-modal="true" aria-labelledby="newsletterModalTitle">
      <div class="newsletter-modal__card">
        <div class="newsletter-modal__header">
          <h3 class="newsletter-modal__title" id="newsletterModalTitle">${title}</h3>
          <button class="newsletter-modal__close" onclick="closeNewsletterModal()" aria-label="Close">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="newsletter-modal__body">
          <div class="newsletter-modal__icon newsletter-modal__icon--${type}">
            <i class="${icon}"></i>
          </div>
          <p class="newsletter-modal__message">${message}</p>
          <div class="newsletter-modal__action">
            <button class="btn btn--primary" onclick="closeNewsletterModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
    <script>
      function closeNewsletterModal() {
        var modal = document.getElementById('newsletterModal');
        if (modal) modal.remove();
      }
      setTimeout(closeNewsletterModal, 6000);
    </script>
  `;
}

export default async function subscribersApiRoutes(fastify, opts) {
  // POST /api/v1/subscribe - Subscribe to newsletter
  fastify.post('/subscribe', async (request, reply) => {
    const isHtmx = request.headers['hx-request'] === 'true';

    try {
      const { email } = request.body;

      if (!email || !email.trim()) {
        reply.code(400);
        if (isHtmx) {
          return reply.type('text/html').send(subscribeModal({
            type: 'error',
            title: 'Missing Email',
            message: 'Please provide a valid email address.',
          }));
        }
        return reply.send({ error: 'Email is required' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        reply.code(400);
        if (isHtmx) {
          return reply.type('text/html').send(subscribeModal({
            type: 'error',
            title: 'Invalid Email',
            message: 'Please enter a valid email address.',
          }));
        }
        return reply.send({ error: 'Invalid email address' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if already subscribed
      const existingSubscriber = await subscribersService.getSubscriberByEmail(normalizedEmail);
      if (existingSubscriber) {
        if (existingSubscriber.status === 'ACTIVE') {
          reply.code(409);
          if (isHtmx) {
            return reply.type('text/html').send(subscribeModal({
              type: 'error',
              title: 'Already Subscribed',
              message: 'You are already subscribed to our newsletter.',
            }));
          }
          return reply.send({ error: 'You are already subscribed to our newsletter' });
        } else {
          // Reactivate unsubscribed subscriber
          await subscribersService.updateSubscriber(existingSubscriber.id, { status: 'ACTIVE' });
          if (isHtmx) {
            return reply.type('text/html').send(subscribeModal({
              type: 'success',
              title: 'Welcome Back!',
              message: 'Your subscription has been reactivated.',
            }));
          }
          return reply.send({ message: 'Welcome back!', data: { email: normalizedEmail } });
        }
      }

      // Create new subscriber
      await subscribersService.createSubscriber({
        email: normalizedEmail,
        status: 'ACTIVE'
      });

      if (isHtmx) {
        return reply.code(201).type('text/html').send(subscribeModal({
          type: 'success',
          title: 'Subscribed!',
          message: 'Thank you for subscribing to our newsletter. Stay tuned for updates!',
        }));
      }
      return reply.code(201).send({ message: 'Successfully subscribed!', data: { email: normalizedEmail } });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      const message = 'Something went wrong. Please try again later.';
      if (isHtmx) {
        return reply.type('text/html').send(subscribeModal({
          type: 'error',
          title: 'Server Error',
          message,
        }));
      }
      return reply.send({ error: message });
    }
  });

  // GET /api/v1/subscribers/count - Get subscriber count (public)
  fastify.get('/count', async (request, reply) => {
    try {
      const count = await subscribersService.getSubscriberCount({ status: 'ACTIVE' });
      return reply.send({ data: { count } });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch subscriber count' });
    }
  });
}
