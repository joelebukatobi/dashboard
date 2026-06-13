// src/admin/controllers/tags.controller.js
// Tags controller - handles tag HTTP requests

import { tagsService } from '../../services/tags.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxLocation,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';

/**
 * Tags Controller
 * Handles tag-related HTTP requests
 */
class TagsController {
  /**
   * GET /admin/tags
   * List all tags
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const {
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        toast,
      } = request.query;

      // Get tags with pagination
      const { data: tags, pagination } = await tagsService.getAll({
        search,
        sortBy,
        sortOrder,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      const {
        tagsListContent,
        tagsListMeta,
        tagsTableFragment,
      } = await import('../templates/pages/tags/index.js');

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, tagsTableFragment({ tags, pagination }));
      }

      return renderAdminPage(
        request,
        reply,
        tagsListMeta({ user: request.user }),
        tagsListContent({
          user,
          tags,
          total: pagination.total,
          page: pagination.page,
          totalPages: pagination.totalPages,
          filters: { search },
          toast,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load tags.' }));
    }
  }

  /**
   * GET /admin/tags/new
   * Show new tag form
   */
  async showNewForm(request, reply) {
    try {
      const { tagNewContent, tagNewMeta } = await import('../templates/pages/tags/index.js');

      return renderAdminPage(
        request,
        reply,
        tagNewMeta(),
        tagNewContent({ user: request.user }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load form.' }));
    }
  }

  /**
   * POST /admin/tags
   * Create a new tag
   */
  async create(request, reply) {
    try {
      const user = request.user;
      const { name, slug, description } = request.body;

      // Create tag
      const tag = await tagsService.create({
        name,
        slug,
        description,
      }, user.id);

      // Redirect to edit page with toast notification
      return htmxLocation(reply, `/admin/tags/${tag.id}/edit`, {
        message: 'Tag created successfully!',
      });
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to create tag.',
      }));
    }
  }

  /**
   * GET /admin/tags/:id/edit
   * Show edit tag form
   */
  async showEditForm(request, reply) {
    try {
      const { id } = request.params;

      // Get tag
      const tag = await tagsService.getById(id);
      if (!tag) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Tag not found.' }));
      }

      const { tagEditContent, tagEditMeta } = await import('../templates/pages/tags/index.js');

      return renderAdminPage(
        request,
        reply,
        tagEditMeta({ tag }),
        tagEditContent({ user: request.user, tag }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load tag.' }));
    }
  }

  /**
   * PUT /admin/tags/:id
   * Update a tag
   */
  async update(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;
      const { name, slug, description } = request.body;

      // Check if tag exists
      const existing = await tagsService.getById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Tag not found.' }));
      }

      // Update tag
      await tagsService.update(id, {
        name,
        slug,
        description,
      }, user.id);

      // Return success with toast notification
      return renderEmpty(setHtmxToast(reply, { message: 'Tag updated successfully!' }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update tag.',
      }));
    }
  }

  /**
   * DELETE /admin/tags/:id
   * Delete a tag
   */
  async delete(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Delete tag
      await tagsService.delete(id, user.id);

      // Redirect to list with toast notification (avoids HTMX fragment response)
      return htmxRedirect(reply, '/admin/tags?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete tag.',
      }));
    }
  }

  /**
   * GET /admin/tags/check-slug
   * Check if slug is available
   */
  async checkSlug(request, reply) {
    try {
      const { slug, excludeId } = request.query;

      if (!slug) {
        return reply.send({ available: false });
      }

      const existing = await tagsService.getBySlug(slug);
      const available = !existing || existing.id === excludeId;

      return reply.send({ available });
    } catch (error) {
      request.log.error(error);
      return reply.send({ available: false });
    }
  }
}

// Export singleton
export const tagsController = new TagsController();
export default tagsController;
