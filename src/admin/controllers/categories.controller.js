// src/admin/controllers/categories.controller.js
// Categories controller - handles category HTTP requests

import { categoriesService } from '../../services/categories.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';

/**
 * Categories Controller
 * Handles category-related HTTP requests
 */
class CategoriesController {
  /**
   * GET /admin/categories
   * List all categories
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

      const { data: categories, pagination } = await categoriesService.getAll({
        search,
        sortBy,
        sortOrder,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      const counts = await categoriesService.getCounts();

      const {
        categoriesListContent,
        categoriesListMeta,
        categoriesTableFragment,
      } = await import('../templates/pages/categories/index.js');

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, categoriesTableFragment({ categories, pagination, counts }));
      }

      return renderAdminPage(
        request,
        reply,
        categoriesListMeta({ user: request.user }),
        categoriesListContent({
          user,
          categories,
          total: pagination.total,
          page: pagination.page,
          totalPages: pagination.totalPages,
          counts,
          filters: { search },
          toast,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load categories.' }));
    }
  }

  /**
   * GET /admin/categories/new
   * Show new category form
   */
  async showNewForm(request, reply) {
    try {
      const { categoryNewContent, categoryNewMeta } = await import('../templates/pages/categories/index.js');

      return renderAdminPage(
        request,
        reply,
        categoryNewMeta(),
        categoryNewContent({ user: request.user }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load form.' }));
    }
  }

  /**
   * POST /admin/categories
   * Create a new category
   */
  async create(request, reply) {
    try {
      const user = request.user;
      const { title, slug, description } = request.body;

      const category = await categoriesService.create({
        title,
        slug,
        description,
      }, user.id);

      const redirectUrl = '/admin/categories?toast=created';
      if (request.headers['hx-request'] !== 'true') {
        return reply.redirect(redirectUrl);
      }
      return htmxRedirect(reply, redirectUrl);
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to create category.',
      }));
    }
  }

  /**
   * GET /admin/categories/:id/edit
   * Show edit category form
   */
  async showEditForm(request, reply) {
    try {
      const { id } = request.params;
      const category = await categoriesService.getById(id);

      if (!category) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Category not found.' }));
      }

      const { categoryEditContent, categoryEditMeta } = await import('../templates/pages/categories/index.js');

      return renderAdminPage(
        request,
        reply,
        categoryEditMeta({ category }),
        categoryEditContent({ user: request.user, category }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({ message: 'Failed to load category.' }));
    }
  }

  /**
   * PUT /admin/categories/:id
   * Update a category
   */
  async update(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;
      const { title, slug, description } = request.body;

      const existing = await categoriesService.getById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({ message: 'Category not found.' }));
      }

      await categoriesService.update(id, { title, slug, description }, user.id);

      return renderEmpty(setHtmxToast(reply, { message: 'Category updated successfully!' }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update category.',
      }));
    }
  }

  /**
   * DELETE /admin/categories/:id
   * Delete a category
   */
  async delete(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      const result = await categoriesService.delete(id, user.id);

      let message = 'Category deleted successfully';
      if (result.postsMoved > 0) {
        message = `Category deleted. ${result.postsMoved} post${result.postsMoved === 1 ? '' : 's'} moved to Uncategorized`;
      }

      return htmxRedirect(reply, `/admin/categories?toast=${encodeURIComponent(message)}`);
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete category.',
      }));
    }
  }

  /**
   * GET /admin/categories/check-slug
   * Check if slug is available
   */
  async checkSlug(request, reply) {
    try {
      const { slug, excludeId } = request.query;

      if (!slug) {
        return reply.send({ available: false });
      }

      const existing = await categoriesService.getBySlug(slug);
      const available = !existing || existing.id === excludeId;

      return reply.send({ available });
    } catch (error) {
      request.log.error(error);
      return reply.send({ available: false });
    }
  }
}

export const categoriesController = new CategoriesController();
export default categoriesController;
