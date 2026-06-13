// src/admin/controllers/videos.controller.js
// Videos controller - handles video HTTP requests

import { videosService } from '../../services/videos.service.js';
import { albumsService } from '../../services/albums.service.js';
import { successToast, errorToast } from '../templates/partials/alerts.js';

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "2.4 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Videos Controller
 * Handles video-related HTTP requests
 */
class VideosController {
  /**
   * GET /admin/media/videos
   * List all videos
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const { search, page = 1, toast } = request.query;

      // Get videos with pagination
      const { data: videos, pagination } = await videosService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      // Get stats
      const stats = await videosService.getStats();

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return only grid fragment
        return reply.type('text/html').send(videosGridFragment({
          videos,
          pagination,
        }));
      }

      // Import videos list template
      const { videosListPage } = await import('../templates/pages/media/videos/index.js');

      return reply.type('text/html').send(
        videosListPage({
          user,
          videos: videos.map(video => ({
            ...video,
            sizeFormatted: formatFileSize(video.size),
            dateFormatted: formatDate(video.createdAt),
            durationFormatted: videosService.formatDuration(video.duration),
          })),
          pagination,
          stats,
          filters: { search },
          toast,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load videos.',
      }));
    }
  }

  /**
   * GET /admin/media/videos/new
   * Show new video form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;

      // Get all posts and albums for dropdowns
      const posts = await videosService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      // Import new video template
      const { videosNewPage } = await import('../templates/pages/media/videos/index.js');

      return reply.type('text/html').send(
        videosNewPage({
          user,
          posts,
          albums,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load new video form.',
      }));
    }
  }

  /**
   * POST /admin/media/videos
   * Upload new video
   */
  async upload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting video upload');

      // Check if request has multipart content type
      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        request.log.warn(`Invalid content type: ${contentType}`);
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }

      // Get all parts (file and fields) with timeout
      let parts;
      try {
        parts = request.parts();
      } catch (parseError) {
        request.log.error('Failed to initialize multipart parser:', parseError);
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Failed to parse upload request. Please try again.',
        }));
      }

      let file = null;
      let postId = null;
      let title = null;
      let altText = null;
      let albumId = null;
      let partCount = 0;

      // IMPORTANT: @fastify/multipart v8 requires file streams to be consumed
      // inside the for await loop. If not consumed, busboy waits forever.
      for await (const part of parts) {
        partCount++;
        request.log.info(`Processing part ${partCount}: type=${part.type}, fieldname=${part.fieldname}`);
        if (part.type === 'file') {
          // Consume file buffer here - REQUIRED for busboy to continue
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
        return reply.type('text/html').send(errorToast({
          message: 'No video file provided. Please select a file to upload.',
        }));
      }

      request.log.info('Starting video service upload');
      // Upload and process video
      const video = await videosService.upload(file, {
        title: title || file.filename,
        altText: altText || '',
        albumId: albumId || null,
      }, user.id);
      request.log.info(`Video uploaded successfully: ${video.id}`);

      // Attach to post if postId provided
      if (postId) {
        await videosService.attachToPost(video.id, postId);
      }

      // Return success with toast notification
      reply.header('HX-Location', `/admin/media/videos/${video.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Video uploaded successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error('Upload error:', error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to upload video.',
      }));
    }
  }

  /**
   * GET /admin/media/videos/:id/edit
   * Show edit video form
   */
  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get video
      const video = await videosService.getById(id);
      if (!video) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Video not found.',
        }));
      }

      // Get all posts and albums for dropdowns
      const posts = await videosService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      // Import edit video template
      const { videosEditPage } = await import('../templates/pages/media/videos/index.js');

      return reply.type('text/html').send(
        videosEditPage({
          user,
          video: {
            ...video,
            sizeFormatted: formatFileSize(video.size),
            dateFormatted: formatDate(video.createdAt),
            durationFormatted: videosService.formatDuration(video.duration),
          },
          posts,
          albums,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load video.',
      }));
    }
  }

  /**
   * PUT /admin/media/videos/:id
   * Update video metadata
   */
  async update(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;
      const { title, altText } = request.body;

      // Check if video exists
      const existing = await videosService.getById(id);
      if (!existing) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Video not found.',
        }));
      }

      // Update video
      await videosService.update(id, {
        title,
        altText,
        albumId: request.body.albumId,
      });

      // Return success with toast
      reply.header('HX-Trigger', JSON.stringify({
        "htmx:toast": { message: 'Video updated successfully', type: 'success' }
      }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to update video.',
      }));
    }
  }

  /**
   * DELETE /admin/media/videos/:id
   * Delete video
   */
  async delete(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get video for message
      const video = await videosService.getById(id);
      if (!video) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Video not found.',
        }));
      }

      // Delete video
      await videosService.delete(id);

      // Redirect to list with toast notification
      reply.header('HX-Redirect', `/admin/media/videos?toast=deleted`);
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to delete video.',
      }));
    }
  }
}

// Helper function for videos grid fragment (HTMX)
function videosGridFragment({ videos, pagination }) {
  if (!videos || videos.length === 0) {
    return `
      <div class="empty">
        <h3>No videos yet</h3>
        <p>Upload your first video to the media library</p>
      </div>
    `;
  }

  const cards = videos.map((video) => {
    const sizeFormatted = formatFileSize(video.size);
    const extension = video.filename.split('.').pop().toUpperCase();
    const durationFormatted = videosService.formatDuration(video.duration);
    const imgPath = (video.thumbnailPath || video.path).startsWith('/public')
      ? (video.thumbnailPath || video.path)
      : '/public' + (video.thumbnailPath || video.path);

    return `
      <a href="/admin/media/videos/${video.id}/edit" class="media-card">
        <div class="media-card__thumbnail">
          <img
            src="${imgPath}"
            alt="${video.altText || video.title}"
          />
          <div class="media-card__thumbnail-badge">${durationFormatted}</div>
          <div class="media-card__details">
            <h3>${video.originalName}</h3>
            <span>${sizeFormatted} • ${extension}</span>
          </div>
          <div class="media-card__actions-overlay">
            <button
              type="button"
              class="media-card__action-btn"
              data-video-id="${video.id}"
              data-video-name="${video.originalName}"
              onclick="event.preventDefault(); event.stopPropagation(); openDeleteModal(this)"
            >
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Build pagination
  let paginationHtml = '';
  if (pagination.totalPages > 1) {
    paginationHtml = `
      <div class="pagination">
        ${pagination.hasPrevPage ? `<a href="?page=${pagination.page - 1}" class="pagination__item"><i data-lucide="chevron-left"></i></a>` : '<span class="pagination__item pagination__item--disabled"><i data-lucide="chevron-left"></i></span>'}
        <span class="pagination__info">Page ${pagination.page} of ${pagination.totalPages}</span>
        ${pagination.hasNextPage ? `<a href="?page=${pagination.page + 1}" class="pagination__item"><i data-lucide="chevron-right"></i></a>` : '<span class="pagination__item pagination__item--disabled"><i data-lucide="chevron-right"></i></span>'}
      </div>
    `;
  }

  return cards;
}

export const videosController = new VideosController();
