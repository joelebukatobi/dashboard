// src/admin/controllers/subscribers.controller.js
// Subscribers Controller - Handles HTTP requests for subscribers

import { subscribersService } from '../../services/subscribers.service.js';
import { subscribersListPage, renderSubscriberRow } from '../templates/pages/subscribers/list.js';
import { newSubscriberPage } from '../templates/pages/subscribers/new.js';
import { editSubscriberPage } from '../templates/pages/subscribers/edit.js';
import { successToast, errorToast } from '../templates/partials/alerts.js';

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

      // Check if HTMX request for partial update
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return table fragment matching what's inside #subscribers-table-container
        return reply
          .type('text/html')
          .send(subscribersTableFragment({
            subscribers: result.subscribers,
            pagination: {
              page: result.page,
              totalPages: result.totalPages,
            },
            filters: { status, search },
          }));
      }

      // Render full page
      return reply.type('text/html').send(
        subscribersListPage({
          user,
          subscribers: result.subscribers,
          pagination: {
            page: result.page,
            totalPages: result.totalPages,
            total: result.total
          },
          filters: { status, search },
          toast
        })
      );
    } catch (error) {
      request.log.error(error);
      return reply.type('text/html').send(
        subscribersListPage({
          user: request.user,
          subscribers: [],
          pagination: { page: 1, totalPages: 1, total: 0 },
          filters: {},
          error: 'Failed to load subscribers'
        })
      );
    }
  }

  /**
   * GET /admin/subscribers/new
   * Show form to add a new subscriber
   */
  async new(request, reply) {
    try {
      const user = request.user;
      
      return reply.type('text/html').send(
        newSubscriberPage({ user })
      );
    } catch (error) {
      request.log.error(error);
      return reply.redirect('/admin/subscribers?error=failed');
    }
  }

  /**
   * GET /admin/subscribers/:id/edit
   * Show form to edit a subscriber
   */
  async edit(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get subscriber by ID
      const subscriber = await subscribersService.getSubscriberById(id);
      if (!subscriber) {
        return reply.redirect('/admin/subscribers?error=notfound');
      }

      return reply.type('text/html').send(
        editSubscriberPage({ user, subscriber })
      );
    } catch (error) {
      request.log.error(error);
      return reply.redirect('/admin/subscribers?error=failed');
    }
  }

  /**
   * POST /admin/subscribers
   * Create a new subscriber
   */
  async create(request, reply) {
    try {
      const { email, status } = request.body;

      if (!email) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Email is required.'
        }));
      }

      // Check if email already exists
      const existing = await subscribersService.getSubscriberByEmail(email);
      if (existing) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'A subscriber with this email already exists.'
        }));
      }

      // Create subscriber
      const subscriber = await subscribersService.createSubscriber({
        email,
        status: status || 'ACTIVE'
      });

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .code(201)
          .type('text/html')
          .header('HX-Trigger', JSON.stringify({
            'toast': { message: 'Subscriber added successfully.', type: 'success' },
            'subscriber-created': { id: subscriber.id }
          }))
          .send(this.renderSubscriberRow(subscriber, request.user));
      }

      return reply.redirect('/admin/subscribers?toast=created');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to add subscriber.'
      }));
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
        return reply.type('text/html').send(errorToast({
          message: 'Subscriber not found.'
        }));
      }

      // If email is being changed, check for duplicates
      if (email && email !== existing.email) {
        const duplicate = await subscribersService.getSubscriberByEmail(email);
        if (duplicate) {
          reply.code(400);
          return reply.type('text/html').send(errorToast({
            message: 'A subscriber with this email already exists.'
          }));
        }
      }

      // Update subscriber
      const subscriber = await subscribersService.updateSubscriber(id, {
        email,
        status
      });

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .type('text/html')
          .header('HX-Trigger', JSON.stringify({
            'toast': { message: 'Subscriber updated successfully.', type: 'success' }
          }))
          .send(this.renderSubscriberRow(subscriber, request.user));
      }

      return reply.redirect('/admin/subscribers?toast=updated');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to update subscriber.'
      }));
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
        return reply.type('text/html').send(errorToast({
          message: 'Subscriber not found.'
        }));
      }

      // Delete subscriber
      await subscribersService.deleteSubscriber(id);

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply
          .type('text/html')
          .header('HX-Trigger', JSON.stringify({
            'toast': { message: 'Subscriber deleted successfully.', type: 'success' },
            'subscriberDeleted': { id: id }
          }))
          .send('');
      }

      return reply.redirect('/admin/subscribers?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to delete subscriber.'
      }));
    }
  }

  /**
   * Render a single subscriber row for HTMX updates
   */
  renderSubscriberRow(subscriber, user) {
    return renderSubscriberRow(subscriber, user);
  }

  /**
   * Render multiple subscriber rows for HTMX updates
   */
  renderSubscriberRows(subscribers, user) {
    return subscribers.map(sub => renderSubscriberRow(sub, user)).join('');
  }
}

/**
 * Generate subscribers table HTML fragment for HTMX updates
 * Matches what's inside #subscribers-table-container in list.js
 */
function subscribersTableFragment({ subscribers, pagination, filters }) {
  if (!subscribers || subscribers.length === 0) {
    return `
      <div class="empty">
        <h3>No Subscribers Yet</h3>
        <p>You don't have any subscribers yet. Click "Add Subscriber" to add one manually.</p>
      </div>
    `;
  }

  const rows = subscribers.map(subscriber => renderSubscriberRow(subscriber)).join('');

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Confirmed</th>
          <th>Subscribed</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${rows}
      </tbody>
    </table>
  `;
}

export const subscribersController = new SubscribersController();
