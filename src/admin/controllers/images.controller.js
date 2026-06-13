// src/admin/controllers/images.controller.js
// Images controller - handles image HTTP requests

import { imagesService } from '../../services/images.service.js';
import { postsService } from '../../services/posts.service.js';
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
 * Images Controller
 * Handles image-related HTTP requests
 */
class ImagesController {
  /**
   * GET /admin/media/images
   * List all images
   */
  async list(request, reply) {
    try {
      const user = request.user;
      const { search, page = 1, toast } = request.query;

      // Get images with pagination
      const { data: images, pagination } = await imagesService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      // Get stats
      const stats = await imagesService.getStats();

      // Check if HTMX request
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        // Return only grid fragment
        return reply.type('text/html').send(imagesGridFragment({
          images,
          pagination,
        }));
      }

      // Import images list template
      const { imagesListPage } = await import('../templates/pages/media/images/index.js');

      return reply.type('text/html').send(
        imagesListPage({
          user,
          images: images.map(img => ({
            ...img,
            sizeFormatted: formatFileSize(img.size),
            dateFormatted: formatDate(img.createdAt),
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
        message: 'Failed to load images: ' + error.message,
      }));
    }
  }

  /**
   * GET /admin/media/images/new
   * Show new image form
   */
  async showNewForm(request, reply) {
    try {
      const user = request.user;

      // Get all posts for attachment dropdown
      const posts = await imagesService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      // Import new image template
      const { imagesNewPage } = await import('../templates/pages/media/images/index.js');

      return reply.type('text/html').send(
        imagesNewPage({
          user,
          posts,
          albums,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load new image form.',
      }));
    }
  }

  /**
   * POST /admin/media/images
   * Upload new image(s)
   */
  /**
   * POST /admin/media/images
   * Upload new image(s)
   */
  async upload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting image upload');
      
      // Check if request has multipart content type
      const contentType = request.headers['content-type'];
      const contentLength = request.headers['content-length'];
      request.log.info(`Request headers - Content-Type: ${contentType}, Content-Length: ${contentLength}`);
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        request.log.warn(`Invalid content type: ${contentType}`);
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }
      
      if (!contentLength || parseInt(contentLength) === 0) {
        request.log.warn('Content-Length is 0 or missing');
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'No file data received. Please select a file to upload.',
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
          message: 'No image file provided. Please select a file to upload.',
        }));
      }

      request.log.info('Starting image service upload');
      // Upload and process image
      const image = await imagesService.upload(file, {
        title: title || file.filename,
        altText: altText || '',
        albumId: albumId || null,
      }, user.id);
      request.log.info(`Image uploaded successfully: ${image.id}`);

      // Attach to post if postId provided
      if (postId) {
        await imagesService.attachToPost(image.id, postId);
      }

      // Return success with toast notification
      reply.header('HX-Location', `/admin/media/images/${image.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Image uploaded successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error('Upload error:', error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to upload image.',
      }));
    }
  }

  /**
   * GET /admin/media/images/:id/edit
   * Show edit image form
   */
  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get image
      const image = await imagesService.getById(id);
      if (!image) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Image not found.',
        }));
      }

      // Get all posts and albums for dropdowns
      const posts = await imagesService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      // Import edit image template
      const { imagesEditPage } = await import('../templates/pages/media/images/index.js');

      return reply.type('text/html').send(
        imagesEditPage({
          user,
          image: {
            ...image,
            sizeFormatted: formatFileSize(image.size),
            dateFormatted: formatDate(image.createdAt),
          },
          posts,
          albums,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load image.',
      }));
    }
  }

  /**
   * PUT /admin/media/images/:id
   * Update image metadata
   */
  async update(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;
      const { title, altText } = request.body;

      // Check if image exists
      const existing = await imagesService.getById(id);
      if (!existing) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Image not found.',
        }));
      }

      // Update image
      await imagesService.update(id, {
        title,
        altText,
        albumId: request.body.albumId,
      });

      // Return success with toast
      reply.header('HX-Trigger', JSON.stringify({
        "htmx:toast": { message: 'Image updated successfully', type: 'success' }
      }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to update image.',
      }));
    }
  }

  /**
   * DELETE /admin/media/images/:id
   * Delete image
   */
  async delete(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      // Get image for message
      const image = await imagesService.getById(id);
      if (!image) {
        reply.code(404);
        return reply.type('text/html').send(errorToast({
          message: 'Image not found.',
        }));
      }

      // Delete image
      await imagesService.delete(id);

      // Redirect to list with toast notification
      reply.header('HX-Redirect', `/admin/media/images?toast=deleted`);
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to delete image.',
      }));
    }
  }

  /**
   * GET /admin/media/images/batch
   * Show batch upload form
   */
  async showBatchForm(request, reply) {
    try {
      const user = request.user;

      // Get albums for dropdown
      const albums = await albumsService.getAllForDropdown();

      // Import batch template
      const { imagesBatchPage } = await import('../templates/pages/media/images/batch.js');

      return reply.type('text/html').send(
        imagesBatchPage({
          user,
          albums,
        })
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorToast({
        message: 'Failed to load batch upload form.',
      }));
    }
  }

  /**
   * POST /admin/media/images/batch
   * Batch upload images
   */
  async batchUpload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting batch image upload');

      // Check content type
      const contentType = request.headers['content-type'];
      request.log.info(`Content-Type: ${contentType}`);
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }

      // Get all parts
      let parts;
      try {
        parts = request.parts();
        request.log.info('Multipart parser initialized successfully');
      } catch (parseError) {
        request.log.error('Failed to initialize multipart parser:', parseError);
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'Failed to parse upload request. Please try again.',
        }));
      }

      const files = [];
      let albumId = null;
      let partCount = 0;

      // Parse all parts
      try {
        for await (const part of parts) {
          partCount++;
          request.log.info(`Processing part ${partCount}: type=${part.type}, fieldname=${part.fieldname}`);
          
          if (part.type === 'file') {
            request.log.info(`Reading file buffer for: ${part.filename}`);
            const buffer = await part.toBuffer();
            files.push({
              filename: part.filename,
              mimetype: part.mimetype,
              toBuffer: async () => buffer,
            });
            request.log.info(`File received: ${part.filename}, mimetype: ${part.mimetype}, size: ${buffer.length}`);
          } else if (part.type === 'field') {
            const value = await part.value;
            request.log.info(`Field received: ${part.fieldname} = ${value}`);
            if (part.fieldname === 'albumId') albumId = value;
          }
        }
      } catch (parseLoopError) {
        request.log.error({ err: parseLoopError, stack: parseLoopError.stack }, 'Error during multipart parsing loop: ' + parseLoopError.message);
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: `Error parsing upload: ${parseLoopError.message || 'Unknown error'}`,
        }));
      }

      request.log.info(`Finished processing ${partCount} parts, ${files.length} files`);

      if (files.length === 0) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'No image files provided. Please select files to upload.',
        }));
      }

      // Batch upload
      request.log.info('Starting batch upload service');
      const results = await imagesService.batchUpload(files, {
        albumId: albumId || null,
      }, user.id);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      request.log.info(`Batch upload complete: ${successful.length} successful, ${failed.length} failed`);

      // Build message
      let message;
      if (failed.length === 0) {
        message = `Successfully uploaded ${successful.length} image${successful.length !== 1 ? 's' : ''}`;
      } else {
        message = `Uploaded ${successful.length} of ${files.length} images. ${failed.length} failed.`;
      }

      // Return success with redirect and toast
      reply.header('HX-Redirect', `/admin/media/images?toast=${encodeURIComponent(message)}`);
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error('Batch upload error:', error);
      
      // Handle specific file size error
      if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
        reply.code(413);
        return reply.type('text/html').send(errorToast({
          message: 'One or more files exceed the 50MB size limit. Please compress your images or upload smaller files.',
        }));
      }
      
      reply.code(400);
      return reply.type('text/html').send(errorToast({
        message: error.message || 'Failed to upload images.',
      }));
    }
  }
}

// Helper function for images grid fragment (HTMX)
function imagesGridFragment({ images, pagination }) {
  if (!images || images.length === 0) {
    return `
      <div class="empty">
        <h3>No images yet</h3>
        <p>Upload your first image to the media library</p>
      </div>
    `;
  }

  const cards = images.map((image) => {
    const sizeFormatted = formatFileSize(image.size);
    const extension = image.filename.split('.').pop().toUpperCase();
    const imgPath = (image.thumbnailPath || image.path).startsWith('/public')
      ? (image.thumbnailPath || image.path)
      : '/public' + (image.thumbnailPath || image.path);

    return `
      <a href="/admin/media/images/${image.id}/edit" class="media-card">
        <div class="media-card__thumbnail">
          <img
            src="${imgPath}"
            alt="${image.altText || image.title}"
          />
          <div class="media-card__details">
            <h3>${image.originalName}</h3>
            <span>${sizeFormatted} • ${extension}</span>
          </div>
          <div class="media-card__actions-overlay">
            <button
              type="button"
              class="media-card__action-btn"
              data-image-id="${image.id}"
              data-image-name="${image.originalName}"
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

export const imagesController = new ImagesController();
