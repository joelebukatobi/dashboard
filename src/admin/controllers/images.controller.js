// src/admin/controllers/images.controller.js
// Images controller - handles image HTTP requests

import { imagesService } from '../../services/images.service.js';
import { postsService } from '../../services/posts.service.js';
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

      // Import new image template
      const { imagesNewPage } = await import('../templates/pages/media/images/index.js');

      return reply.type('text/html').send(
        imagesNewPage({
          user,
          posts,
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
      
      // Get all parts (file and fields)
      const parts = request.parts();
      let file = null;
      let postId = null;
      let title = null;
      let altText = null;
      
      for await (const part of parts) {
        if (part.type === 'file') {
          file = part;
        } else if (part.type === 'field') {
          const value = await part.value;
          if (part.fieldname === 'postId') postId = value;
          if (part.fieldname === 'title') title = value;
          if (part.fieldname === 'altText') altText = value;
        }
      }
      
      if (!file) {
        reply.code(400);
        return reply.type('text/html').send(errorToast({
          message: 'No image file provided.',
        }));
      }

      // Upload and process image
      const image = await imagesService.upload(file, {
        title: title || file.filename,
        altText: altText || '',
      }, user.id);

      // Attach to post if postId provided
      if (postId) {
        await imagesService.attachToPost(image.id, postId);
      }

      // Return success with toast notification
      reply.header('HX-Location', `/admin/media/images/${image.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Image uploaded successfully!', type: 'success' } }));
      return reply.type('text/html').send('');
    } catch (error) {
      request.log.error(error);
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

      // Get all posts for attachment dropdown
      const posts = await imagesService.getAllPostsForAttachment();

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
}

// Helper function for images grid fragment (HTMX)
function imagesGridFragment({ images, pagination }) {
  if (!images || images.length === 0) {
    return `
      <div class="empty">
        <i data-lucide="image"></i>
        <h3>No images yet</h3>
        <p>Upload your first image to the media library</p>
      </div>
    `;
  }

  const cards = images.map((image) => {
    const sizeFormatted = formatFileSize(image.size);
    const extension = image.filename.split('.').pop().toUpperCase();
    
    return `
      <div class="media-card group">
        ${image.tag ? `<span class="media-card__tag">${image.tag}</span>` : ''}
        <div class="media-card__thumbnail">
          <img
            src="${image.thumbnailPath || image.path}"
            alt="${image.altText || image.title}"
            loading="lazy"
          />
          <div class="media-card__actions">
            <a href="/admin/media/images/${image.id}/edit" class="media-card__action-btn" title="Edit">
              <i data-lucide="pencil" class="size-4"></i>
            </a>
            <button 
              class="media-card__action-btn media-card__action-btn--delete" 
              title="Delete"
              data-image-id="${image.id}"
              data-image-name="${image.originalName}"
              onclick="openDeleteModal(this)"
            >
              <i data-lucide="trash-2" class="size-4"></i>
            </button>
          </div>
        </div>
        <div class="media-card__details">
          <h3 class="media-card__title">${image.originalName}</h3>
          <span class="media-card__meta">${sizeFormatted} • ${extension}</span>
        </div>
      </div>
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

  return `
    <div class="media-grid">
      ${cards}
    </div>
    ${paginationHtml}
  `;
}

export const imagesController = new ImagesController();
