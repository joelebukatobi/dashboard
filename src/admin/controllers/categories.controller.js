// src/admin/controllers/categories.controller.js
// Categories controller - handles category HTTP requests

import { categoriesService } from '../../services/categories.service.js';

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

      // Get categories with pagination
      const { data: categories, pagination } = await categoriesService.getAll({
        search,
        sortBy,
        sortOrder,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      // Get counts for filter tabs
      const counts = await categoriesService.getCounts();

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return only table fragment
        return reply.type('text/html').send(categoriesTableFragment({
          categories,
          pagination,
          counts,
        }));
      }

      // Import categories list template
      const { categoriesListPage } = await import('../templates/pages/categories/index.js');

      return reply.type('text/html').send(
        categoriesListPage({
          user,
          categories,
          total: pagination.total,
          page: pagination.page,
          totalPages: pagination.totalPages,
          counts,
          filters: { search },
          toast,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load categories.',
      }));
    }
  }

  /**
   * GET /admin/categories/new
   * Show new category form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;

      // Import new category template
      const { categoryNewPage } = await import('../templates/pages/categories/index.js');

      return reply.type('text/html').send(
        categoryNewPage({ user })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load form.',
      }));
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

      // Validate required fields
      if (!title) {
        reply.code(400);
        return reply.type('text/html').send(errorFragment({
          message: 'Title is required.',
        }));
      }

      // Create category
      const category = await categoriesService.create({
        title,
        slug,
        description,
      }, user.id);

      // Redirect to edit page with toast notification
      reply.header('HX-Location', `/admin/categories/${category.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Category created successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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
      const user = request.user;
      const { id } = request.params;

      // Get category
      const category = await categoriesService.getById(id);
      if (!category) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Category not found.',
        }));
      }

      // Import edit category template
      const { categoryEditPage } = await import('../templates/pages/categories/index.js');

      return reply.type('text/html').send(
        categoryEditPage({ user, category })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load category.',
      }));
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

      // Check if category exists
      const existing = await categoriesService.getById(id);
      if (!existing) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Category not found.',
        }));
      }

      // Update category
      await categoriesService.update(id, {
        title,
        slug,
        description,
      }, user.id);

      // Return success with toast notification
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Category updated successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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

      // Delete category and get result
      const result = await categoriesService.delete(id, user.id);

      // Build success message
      let message = 'Category deleted successfully';
      if (result.postsMoved > 0) {
        message = `Category deleted. ${result.postsMoved} post${result.postsMoved === 1 ? '' : 's'} moved to Uncategorized`;
      }

      // Full browser redirect to categories list with toast param
      reply.header('HX-Redirect', `/admin/categories?toast=${encodeURIComponent(message)}`);
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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

// Helper function for categories table fragment
function categoriesTableFragment({ categories, pagination, counts }) {
  if (!categories || categories.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="folder-open"></i>
        </div>
        <h3 class="empty-state__title">No categories found</h3>
        <p class="empty-state__description">Get started by creating your first category.</p>
        <a href="/admin/categories/new" class="btn btn--primary mt-4">
          Create Category
        </a>
      </div>
    `;
  }

  const rows = categories.map((category) => {
    const date = new Date(category.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Title</span>
          <div class="table__title">
            <a href="/admin/categories/${category.id}/edit">${category.title}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${category.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${category.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/categories/${category.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-category-id="${category.id}"
              data-category-title="${category.title}"
              data-post-count="${category.postCount || 0}"
              onclick="openDeleteModal(this)"
            >
              <i data-lucide="trash-2" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Build pagination for the fragment
  const paginationFragment = pagination && pagination.totalPages > 1 
    ? fragmentPaginationHtml({ 
        page: pagination.page, 
        totalPages: pagination.totalPages, 
        filters: {} 
      }) 
    : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Title</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody class="table__tbody">
        ${rows}
      </tbody>
    </table>
    ${paginationFragment}
  `;
}

// Pagination helper for fragments (mirrors the template's paginationHtml)
function fragmentPaginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/categories?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

  // Page numbers
  let pageNumbers = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (page <= 3) {
    pageNumbers = [1, 2, 3, 4, '...', totalPages];
  } else if (page >= totalPages - 2) {
    pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pageNumbers = [1, '...', page - 1, page, page + 1, '...', totalPages];
  }

  pageNumbers.forEach((p) => {
    if (p === '...') {
      links += '<span class="pagination__ellipsis">...</span>';
    } else {
      const active = p === page ? 'pagination__item--active' : '';
      links += `<a href="/admin/categories?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/categories?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}

// Helper function for error fragment
function errorFragment({ message }) {
  return `
    <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800" role="alert">
      <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;
}

// Export singleton
export const categoriesController = new CategoriesController();
export default categoriesController;
