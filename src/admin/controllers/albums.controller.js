// src/admin/controllers/albums.controller.js
// Albums controller - handles album HTTP requests

import { albumsService } from '../../services/albums.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';

class AlbumsController {
  async list(request, reply) {
    try {
      const user = request.user;
      const { search, page = 1, toast } = request.query;

      const { data: albums, pagination } = await albumsService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      const {
        albumsListContent,
        albumsListMeta,
        albumsTableFragment,
      } = await import('../templates/pages/albums/index.js');

      const data = {
        user,
        albums,
        total: pagination.total,
        page: pagination.page,
        totalPages: pagination.totalPages,
        filters: { search },
        toast,
      };

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, albumsTableFragment({ albums, pagination }));
      }

      return renderAdminPage(
        request,
        reply,
        albumsListMeta({ user }),
        albumsListContent(data),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load albums.',
      }));
    }
  }

  async showNewForm(request, reply) {
    try {
      const user = request.user;
      const { albumNewContent, albumNewMeta } = await import('../templates/pages/albums/index.js');

      return renderAdminPage(
        request,
        reply,
        albumNewMeta(),
        albumNewContent({ user }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load form.',
      }));
    }
  }

  async create(request, reply) {
    try {
      const { title, slug, description, coverImageId } = request.body;

      const album = await albumsService.create({
        title,
        slug,
        description,
        coverImageId: coverImageId || null,
      });

      const redirectUrl = `/admin/media/albums/${album.id}/edit?toast=created`;
      if (request.headers['hx-request'] !== 'true') {
        return reply.redirect(redirectUrl);
      }
      return htmxRedirect(reply, redirectUrl);
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to create album.',
      }));
    }
  }

  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      const album = await albumsService.getById(id);
      if (!album) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Album not found.',
        }));
      }

      const { data: albumImages } = await albumsService.getAlbumMedia(id, { limit: 50 });

      const { albumEditContent, albumEditMeta } = await import('../templates/pages/albums/index.js');

      return renderAdminPage(
        request,
        reply,
        albumEditMeta({ album }),
        albumEditContent({ user, album, albumImages, toast: request.query?.toast }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load album.',
      }));
    }
  }

  async update(request, reply) {
    try {
      const { id } = request.params;
      const { title, slug, description, coverImageId } = request.body;

      const existing = await albumsService.getById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Album not found.',
        }));
      }

      await albumsService.update(id, {
        title,
        slug,
        description,
        coverImageId: coverImageId || null,
      });

      return renderEmpty(setHtmxToast(reply, { message: 'Album updated successfully!' }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update album.',
      }));
    }
  }

  async delete(request, reply) {
    try {
      const { id } = request.params;

      await albumsService.delete(id);

      return htmxRedirect(reply, '/admin/media/albums?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete album.',
      }));
    }
  }
}

export const albumsController = new AlbumsController();
export default albumsController;
