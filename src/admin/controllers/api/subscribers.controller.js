import { subscribersService } from '../../../services/subscribers.service.js';
import { subscribeModal } from '../../templates/partials/subscribe-modal.js';

class SubscribersAPIController {
  /**
   * POST /api/v1/subscribe
   */
  async subscribe(request, reply) {
    const isHtmx = request.headers['hx-request'] === 'true';

    try {
      const { email } = request.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existingSubscriber = await subscribersService.getSubscriberByEmail(normalizedEmail);
      if (existingSubscriber) {
        if (existingSubscriber.status === 'ACTIVE') {
          reply.code(409);
          if (isHtmx) {
            return reply.html`!${subscribeModal({
              type: 'error',
              title: 'Already Subscribed',
              message: 'You are already subscribed to our newsletter.',
            })}`;
          }
          return reply.send({ error: 'You are already subscribed to our newsletter' });
        }

        await subscribersService.updateSubscriber(existingSubscriber.id, { status: 'ACTIVE' });
        if (isHtmx) {
          return reply.html`!${subscribeModal({
            type: 'success',
            title: 'Welcome Back!',
            message: 'Your subscription has been reactivated.',
          })}`;
        }
        return reply.send({ message: 'Welcome back!', data: { email: normalizedEmail } });
      }

      await subscribersService.createSubscriber({
        email: normalizedEmail,
        status: 'ACTIVE',
      });

      if (isHtmx) {
        reply.code(201);
        return reply.html`!${subscribeModal({
          type: 'success',
          title: 'Subscribed!',
          message: 'Thank you for subscribing to our newsletter. Stay tuned for updates!',
        })}`;
      }

      return reply.code(201).send({ message: 'Successfully subscribed!', data: { email: normalizedEmail } });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      const message = 'Something went wrong. Please try again later.';
      if (isHtmx) {
        return reply.html`!${subscribeModal({
          type: 'error',
          title: 'Server Error',
          message,
        })}`;
      }
      return reply.send({ error: message });
    }
  }

  /**
   * GET /api/v1/subscribers/count
   */
  async count(request, reply) {
    try {
      const count = await subscribersService.getSubscriberCount({ status: 'ACTIVE' });
      return reply.send({ data: { count } });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch subscriber count' });
    }
  }
}

export const subscribersAPIController = new SubscribersAPIController();
