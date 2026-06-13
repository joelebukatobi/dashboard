// src/admin/controllers/subscribers.controller.js
// Subscribers Controller - Handles HTTP requests for subscribers

import { subscribersService } from '../../services/subscribers.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  setHtmxTrigger,
} from '../render.js';

/**
 * Subscribers Controller
 * Handles all subscriber-related HTTP requests
 */
class SubscribersController {
  /**
   * GET /admin/subscribers
   * List all subscribers
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const query = request.query;

      // Parse pagination and filters
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const status = query.status || '';
      const search = query.search || '';
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';
      const toast = query.toast || '';

      // Get subscribers from service
      const result = await subscribersService.getAllSubscribers({
        page,
        limit,
        status,
        search,
        sortBy,
        sortOrder
      });

      const {
        subscribersListContent,
        subscribersListMeta,
        subscribersTableFragment,
      } = await import('../templates/pages/subscribers/index.js');

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, subscribersTableFragment({
          subscribers: result.subscribers,
          pagination: {
            page: result.page,
            totalPages: result.totalPages,
          },
          filters: { status, search },
        }));
      }

      return renderAdminPage(
        request,
        reply,
        subscribersListMeta({ user: request.user }),
        subscribersListContent({
          user,
          subscribers: result.subscribers,
          pagination: {
            page: result.page,
            totalPages: result.totalPages,
            total: result.total
          },
          filters: { status, search },
          toast
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load subscribers.' }));
    }
  }

  /**
   * GET /admin/subscribers/new
   * Show form to add a new subscriber
   */
  async new(request, reply) {
    try {
      const { newSubscriberContent, newSubscriberMeta } = await import('../templates/pages/subscribers/index.js');

      return renderAdminPage(
        request,
        reply,
        newSubscriberMeta(),
        newSubscriberContent({ user: request.user }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load form.' }));
    }
  }

  /**
   * GET /admin/subscribers/:id/edit
   * Show form to edit a subscriber
   */
  async edit(request, reply) {
    try {
      const { id } = request.params;

      // Get subscriber by ID
      const subscriber = await subscribersService.getSubscriberById(id);
      if (!subscriber) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Subscriber not found.' }));
      }

      const { editSubscriberContent, editSubscriberMeta } = await import('../templates/pages/subscribers/index.js');

      return renderAdminPage(
        request,
        reply,
        editSubscriberMeta({ subscriber }),
        editSubscriberContent({ user: request.user, subscriber }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load subscriber.' }));
    }
  }

  /**
   * POST /admin/subscribers
   * Create a new subscriber
   */
  async create(request, reply) {
    try {
      const { email, status } = request.body;

      // Check if email already exists
      const existing = await subscribersService.getSubscriberByEmail(email);
      if (existing) {
        reply.code(400);
        return renderFragment(reply, errorAlert({ message: 'A subscriber with this email already exists.' }));
      }

      // Create subscriber
      const subscriber = await subscribersService.createSubscriber({
        email,
        status: status || 'ACTIVE'
      });

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        const { renderSubscriberRow } = await import('../templates/pages/subscribers/index.js');
        reply.code(201);
        setHtmxTrigger(reply, {
          toast: { message: 'Subscriber added successfully.', type: 'success' },
          'subscriber-created': { id: subscriber.id },
        });
        return renderFragment(reply, renderSubscriberRow(subscriber));
      }

      return reply.redirect('/admin/subscribers?toast=created');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to add subscriber.' }));
    }
  }

  /**
   * PUT /admin/subscribers/:id
   * Update a subscriber
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const { email, status } = request.body;

      // Check if subscriber exists
      const existing = await subscribersService.getSubscriberById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Subscriber not found.' }));
      }

      // If email is being changed, check for duplicates
      if (email && email !== existing.email) {
        const duplicate = await subscribersService.getSubscriberByEmail(email);
        if (duplicate) {
          reply.code(400);
          return renderFragment(reply, errorAlert({ message: 'A subscriber with this email already exists.' }));
        }
      }

      // Update subscriber
      const subscriber = await subscribersService.updateSubscriber(id, {
        email,
        status
      });

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        const { renderSubscriberRow } = await import('../templates/pages/subscribers/index.js');
        setHtmxTrigger(reply, {
          toast: { message: 'Subscriber updated successfully.', type: 'success' },
        });
        return renderFragment(reply, renderSubscriberRow(subscriber));
      }

      return reply.redirect('/admin/subscribers?toast=updated');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to update subscriber.' }));
    }
  }

  /**
   * DELETE /admin/subscribers/:id
   * Delete a subscriber
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if subscriber exists
      const existing = await subscribersService.getSubscriberById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Subscriber not found.' }));
      }

      // Delete subscriber
      await subscribersService.deleteSubscriber(id);

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        setHtmxTrigger(reply, {
          toast: { message: 'Subscriber deleted successfully.', type: 'success' },
          subscriberDeleted: { id },
        });
        return renderEmpty(reply);
      }

      return reply.redirect('/admin/subscribers?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to delete subscriber.' }));
    }
  }
}

export const subscribersController = new SubscribersController();
