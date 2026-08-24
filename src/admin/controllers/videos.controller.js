// src/admin/controllers/videos.controller.js
// Videos controller - handles video HTTP requests

import { videosService } from '../../services/videos.service.js';
import { albumsService } from '../../services/albums.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';
import { formatSiteDate } from '../../lib/site-dates.js';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

class VideosController {
  async list(request, reply) {
    try {
      const user = request.user;
      const { search, page = 1, toast } = request.query;

      const { data: videos, pagination } = await videosService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      await videosService.getStats();

      const {
        videosListContent,
        videosListMeta,
        videosGridFragment,
      } = await import('../templates/pages/media/videos/index.js');

      const data = {
        user,
        videos: videos.map((video) => ({
          ...video,
          sizeFormatted: formatFileSize(video.size),
          dateFormatted: formatSiteDate(video.createdAt, request.siteSettingsMap ?? {}),
          durationFormatted: videosService.formatDuration(video.duration),
        })),
        pagination,
        filters: { search },
        toast,
      };

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, videosGridFragment(data));
      }

      return renderAdminPage(
        request,
        reply,
        videosListMeta({ user }),
        videosListContent(data),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load videos.',
      }));
    }
  }

  async showNewForm(request, reply) {
    try {
      const user = request.user;
      const posts = await videosService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      const { videosNewContent, videosNewMeta } = await import('../templates/pages/media/videos/index.js');

      return renderAdminPage(
        request,
        reply,
        videosNewMeta(),
        videosNewContent({ user, posts, albums }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load new video form.',
      }));
    }
  }

  async upload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting video upload');

      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        request.log.warn(`Invalid content type: ${contentType}`);
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }

      let parts;
      try {
        parts = request.parts();
      } catch (parseError) {
        request.log.error('Failed to initialize multipart parser:', parseError);
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Failed to parse upload request. Please try again.',
        }));
      }

      let file = null;
      let postId = null;
      let title = null;
      let altText = null;
      let albumId = null;
      let partCount = 0;

      for await (const part of parts) {
        partCount++;
        request.log.info(`Processing part ${partCount}: type=${part.type}, fieldname=${part.fieldname}`);
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          request.log.info(`File received: ${part.filename}, mimetype: ${part.mimetype}, size: ${buffer.length}`);
          file = {
            filename: part.filename,
            mimetype: part.mimetype,
            toBuffer: async () => buffer,
          };
        } else if (part.type === 'field') {
          const value = await part.value;
          request.log.info(`Field received: ${part.fieldname} = ${value}`);
          if (part.fieldname === 'postId') postId = value;
          if (part.fieldname === 'title') title = value;
          if (part.fieldname === 'altText') altText = value;
          if (part.fieldname === 'albumId') albumId = value;
        }
      }

      request.log.info(`Finished processing ${partCount} parts`);

      if (!file) {
        request.log.warn(`No file found in request after parsing ${partCount} parts`);
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'No video file provided. Please select a file to upload.',
        }));
      }

      request.log.info('Starting video service upload');
      const video = await videosService.upload(file, {
        title: title || file.filename,
        altText: altText || '',
        albumId: albumId || null,
      }, user.id);
      request.log.info(`Video uploaded successfully: ${video.id}`);

      if (postId) {
        await videosService.attachToPost(video.id, postId);
      }

      const redirectUrl = `/admin/media/videos/${video.id}/edit?toast=uploaded`;
      if (request.headers['hx-request'] !== 'true') {
        return reply.redirect(redirectUrl);
      }
      return htmxRedirect(reply, redirectUrl);
    } catch (error) {
      request.log.error('Upload error:', error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to upload video.',
      }));
    }
  }

  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      const video = await videosService.getById(id);
      if (!video) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Video not found.',
        }));
      }

      const posts = await videosService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      const videoData = {
        ...video,
        sizeFormatted: formatFileSize(video.size),
        dateFormatted: formatSiteDate(video.createdAt, request.siteSettingsMap ?? {}),
        durationFormatted: videosService.formatDuration(video.duration),
      };

      const { videosEditContent, videosEditMeta } = await import('../templates/pages/media/videos/index.js');

      return renderAdminPage(
        request,
        reply,
        videosEditMeta({ user, video: videoData }),
        videosEditContent({
          user,
          video: videoData,
          posts,
          albums,
          toast: request.query?.toast,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load video.',
      }));
    }
  }

  async update(request, reply) {
    try {
      const { id } = request.params;
      const { title, altText } = request.body;

      const existing = await videosService.getById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Video not found.',
        }));
      }

      await videosService.update(id, {
        title,
        altText,
        albumId: request.body.albumId,
      });

      return renderEmpty(setHtmxToast(reply, { message: 'Video updated successfully' }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update video.',
      }));
    }
  }

  async delete(request, reply) {
    try {
      const { id } = request.params;

      const video = await videosService.getById(id);
      if (!video) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Video not found.',
        }));
      }

      await videosService.delete(id);

      return htmxRedirect(reply, '/admin/media/videos?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete video.',
      }));
    }
  }
}

export const videosController = new VideosController();
