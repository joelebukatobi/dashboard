// src/admin/controllers/tags.controller.js
// Tags controller - handles tag HTTP requests

import { tagsService } from '../../services/tags.service.js';

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

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return only table fragment
        return reply.type('text/html').send(tagsTableFragment({
          tags,
          pagination,
        }));
      }

      // Import tags list template
      const { tagsListPage } = await import('../templates/pages/tags/index.js');

      return reply.type('text/html').send(
        tagsListPage({
          user,
          tags,
          total: pagination.total,
          page: pagination.page,
          totalPages: pagination.totalPages,
          filters: { search },
          toast,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load tags.',
      }));
    }
  }

  /**
   * GET /admin/tags/new
   * Show new tag form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;

      // Import new tag template
      const { tagNewPage } = await import('../templates/pages/tags/index.js');

      return reply.type('text/html').send(
        tagNewPage({ user })
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
   * POST /admin/tags
   * Create a new tag
   */
  async create(request, reply) {
    try {
      const user = request.user;
      const { name, slug, description } = request.body;

      // Validate required fields
      if (!name) {
        reply.code(400);
        return reply.type('text/html').send(errorFragment({
          message: 'Name is required.',
        }));
      }

      // Create tag
      const tag = await tagsService.create({
        name,
        slug,
        description,
      }, user.id);

      // Redirect to edit page with toast notification
      reply.header('HX-Location', `/admin/tags/${tag.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Tag created successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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
      const user = request.user;
      const { id } = request.params;

      // Get tag
      const tag = await tagsService.getById(id);
      if (!tag) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Tag not found.',
        }));
      }

      // Import edit tag template
      const { tagEditPage } = await import('../templates/pages/tags/index.js');

      return reply.type('text/html').send(
        tagEditPage({ user, tag })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load tag.',
      }));
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
        return reply.type('text/html').send(errorFragment({
          message: 'Tag not found.',
        }));
      }

      // Update tag
      await tagsService.update(id, {
        name,
        slug,
        description,
      }, user.id);

      // Return success with toast notification
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Tag updated successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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
      reply.header('HX-Redirect', '/admin/tags?toast=deleted');
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
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

// Helper function for tags table fragment
function tagsTableFragment({ tags, pagination }) {
  if (!tags || tags.length === 0) {
    return `
      <div class="text-center py-12">
        <i data-lucide="tag" class="w-16 h-16 mx-auto mb-4 text-gray-300"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tags found</h3>
        <p class="text-gray-500 mb-4">Get started by creating your first tag.</p>
        <a href="/admin/tags/new" class="btn btn--primary">
          <i data-lucide="plus"></i>
          Create Tag
        </a>
      </div>
    `;
  }

  const rows = tags.map((tag) => {
    const date = new Date(tag.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Name</span>
          <div class="table__title">
            <a href="/admin/tags/${tag.id}/edit">${tag.name}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${tag.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${tag.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Posts</span>
          <span class="badge badge--neutral">${tag.postCount || 0}</span>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/tags/${tag.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-tag-id="${tag.id}"
              data-tag-name="${tag.name}"
              data-post-count="${tag.postCount || 0}"
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
          <th>Name</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Posts</th>
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
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/tags?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="/admin/tags?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/tags?page=${page + 1}${queryPrefix}` : '#';
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
export const tagsController = new TagsController();
export default tagsController;
