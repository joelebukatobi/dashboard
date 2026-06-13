// src/admin/controllers/albums.controller.js
// Albums controller - handles album HTTP requests

import { albumsService } from '../../services/albums.service.js';

/**
 * Albums Controller
 * Handles album-related HTTP requests
 */
class AlbumsController {
  /**
   * GET /admin/media/albums
   * List all albums
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const {
        search,
        page = 1,
        toast,
      } = request.query;

      const { data: albums, pagination } = await albumsService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply.type('text/html').send(albumsTableFragment({
          albums,
          pagination,
        }));
      }

      const { albumsListPage } = await import('../templates/pages/albums/index.js');

      return reply.type('text/html').send(
        albumsListPage({
          user,
          albums,
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
        message: 'Failed to load albums.',
      }));
    }
  }

  /**
   * GET /admin/media/albums/new
   * Show new album form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;
      const { albumNewPage } = await import('../templates/pages/albums/index.js');
      return reply.type('text/html').send(albumNewPage({ user }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load form.',
      }));
    }
  }

  /**
   * POST /admin/media/albums
   * Create a new album
   */
  async create(request, reply) {
    try {
      const user = request.user;
      const { title, slug, description, coverImageId } = request.body;

      if (!title) {
        reply.code(400);
        return reply.type('text/html').send(errorFragment({
          message: 'Title is required.',
        }));
      }

      const album = await albumsService.create({
        title,
        slug,
        description,
        coverImageId: coverImageId || null,
      });

      reply.header('HX-Location', `/admin/media/albums/${album.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Album created successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to create album.',
      }));
    }
  }

  /**
   * GET /admin/media/albums/:id/edit
   * Show edit album form
   */
  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      const album = await albumsService.getById(id);
      if (!album) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Album not found.',
        }));
      }

      // Get album images for cover selection
      const { data: albumImages } = await albumsService.getAlbumMedia(id, { limit: 50 });

      const { albumEditPage } = await import('../templates/pages/albums/index.js');
      return reply.type('text/html').send(albumEditPage({ user, album, albumImages }));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load album.',
      }));
    }
  }

  /**
   * PUT /admin/media/albums/:id
   * Update an album
   */
  async update(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;
      const { title, slug, description, coverImageId } = request.body;

      const existing = await albumsService.getById(id);
      if (!existing) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Album not found.',
        }));
      }

      await albumsService.update(id, {
        title,
        slug,
        description,
        coverImageId: coverImageId || null,
      });

      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Album updated successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to update album.',
      }));
    }
  }

  /**
   * DELETE /admin/media/albums/:id
   * Delete an album
   */
  async delete(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      await albumsService.delete(id);

      reply.header('HX-Redirect', '/admin/media/albums?toast=deleted');
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to delete album.',
      }));
    }
  }
}

function albumsTableFragment({ albums, pagination }) {
  if (!albums || albums.length === 0) {
    return `
      <div class="empty">
        <h3>No albums found</h3>
        <p>Create your first album to organize images and videos.</p>
      </div>
    `;
  }

  const rows = albums.map((album) => {
    const coverSrc = album.coverImage?.thumbnailPath || album.coverImage?.path || '/dist/favicon.svg';
    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Album</span>
          <div class="flex items-center gap-3">
            <img src="${coverSrc}" alt="" class="w-10 h-10 rounded object-cover" />
            <div class="table__title">
              <a href="/admin/media/albums/${album.id}/edit">${album.title}</a>
            </div>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Slug</span>
          <div class="table__slug">${album.slug}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Description</span>
          <div class="table__title">${album.description || '-'}</div>
        </td>
        <td class="table__td">
          <span class="table__label">Created</span>
          ${new Date(album.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/media/albums/${album.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-album-id="${album.id}"
              data-album-title="${album.title}"
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

  const paginationFragment = pagination && pagination.totalPages > 1
    ? fragmentPaginationHtml({ page: pagination.page, totalPages: pagination.totalPages, filters: {} })
    : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Album</th>
          <th>Slug</th>
          <th>Description</th>
          <th>Created</th>
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

function fragmentPaginationHtml({ page, totalPages, filters }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/media/albums?page=${page - 1}${queryPrefix}` : '#';
  links += `<a href="${prevHref}" class="pagination__item ${prevDisabled}"><i data-lucide="chevron-left"></i></a>`;

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
      links += `<a href="/admin/media/albums?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/media/albums?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">${links}</div>
    </footer>
  `;
}

function errorFragment({ message }) {
  return `
    <div class="alert alert--error" role="alert">
      <i data-lucide="alert-circle" class="alert__icon"></i>
      <span class="alert__message">${message}</span>
    </div>
  `;
}

export const albumsController = new AlbumsController();
export default albumsController;
