// src/admin/controllers/images.controller.js
// Images controller - handles image HTTP requests

import { imagesService } from '../../services/images.service.js';
import { albumsService } from '../../services/albums.service.js';
import {
  renderAdminPage,
  renderFragment,
  renderEmpty,
  errorAlert,
  htmxLocation,
  htmxRedirect,
  setHtmxToast,
} from '../render.js';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

class ImagesController {
  async list(request, reply) {
    try {
      const user = request.user;
      const { search, page = 1, toast } = request.query;

      const { data: images, pagination } = await imagesService.getAll({
        search,
        page: parseInt(page, 10) || 1,
        limit: 10,
      });

      await imagesService.getStats();

      const {
        imagesListContent,
        imagesListMeta,
        imagesGridFragment,
      } = await import('../templates/pages/media/images/index.js');

      const data = {
        user,
        images: images.map((img) => ({
          ...img,
          sizeFormatted: formatFileSize(img.size),
          dateFormatted: formatDate(img.createdAt),
        })),
        pagination,
        filters: { search },
        toast,
      };

      if (request.headers['hx-request'] === 'true') {
        return renderFragment(reply, imagesGridFragment(data));
      }

      return renderAdminPage(
        request,
        reply,
        imagesListMeta({ user }),
        imagesListContent(data),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load images: ' + error.message,
      }));
    }
  }

  async showNewForm(request, reply) {
    try {
      const user = request.user;
      const posts = await imagesService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      const { imagesNewContent, imagesNewMeta } = await import('../templates/pages/media/images/index.js');

      return renderAdminPage(
        request,
        reply,
        imagesNewMeta(),
        imagesNewContent({ user, posts, albums }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load new image form.',
      }));
    }
  }

  async upload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting image upload');

      const contentType = request.headers['content-type'];
      const contentLength = request.headers['content-length'];
      request.log.info(`Request headers - Content-Type: ${contentType}, Content-Length: ${contentLength}`);

      if (!contentType || !contentType.includes('multipart/form-data')) {
        request.log.warn(`Invalid content type: ${contentType}`);
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }

      if (!contentLength || parseInt(contentLength) === 0) {
        request.log.warn('Content-Length is 0 or missing');
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'No file data received. Please select a file to upload.',
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
          message: 'No image file provided. Please select a file to upload.',
        }));
      }

      request.log.info('Starting image service upload');
      const image = await imagesService.upload(file, {
        title: title || file.filename,
        altText: altText || '',
        albumId: albumId || null,
      }, user.id);
      request.log.info(`Image uploaded successfully: ${image.id}`);

      if (postId) {
        await imagesService.attachToPost(image.id, postId);
      }

      return htmxLocation(reply, `/admin/media/images/${image.id}/edit`, {
        message: 'Image uploaded successfully!',
      });
    } catch (error) {
      request.log.error('Upload error:', error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to upload image.',
      }));
    }
  }

  async showEditForm(request, reply) {
    try {
      const user = request.user;
      const { id } = request.params;

      const image = await imagesService.getById(id);
      if (!image) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Image not found.',
        }));
      }

      const posts = await imagesService.getAllPostsForAttachment();
      const albums = await albumsService.getAllForDropdown();

      const imageData = {
        ...image,
        sizeFormatted: formatFileSize(image.size),
        dateFormatted: formatDate(image.createdAt),
      };

      const { imagesEditContent, imagesEditMeta } = await import('../templates/pages/media/images/index.js');

      return renderAdminPage(
        request,
        reply,
        imagesEditMeta({ user, image: imageData }),
        imagesEditContent({
          user,
          image: imageData,
          posts,
          albums,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load image.',
      }));
    }
  }

  async update(request, reply) {
    try {
      const { id } = request.params;
      const { title, altText } = request.body;

      const existing = await imagesService.getById(id);
      if (!existing) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Image not found.',
        }));
      }

      await imagesService.update(id, {
        title,
        altText,
        albumId: request.body.albumId,
      });

      return renderEmpty(setHtmxToast(reply, { message: 'Image updated successfully' }));
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to update image.',
      }));
    }
  }

  async delete(request, reply) {
    try {
      const { id } = request.params;

      const image = await imagesService.getById(id);
      if (!image) {
        reply.code(404);
        return renderFragment(reply, errorAlert({
          message: 'Image not found.',
        }));
      }

      await imagesService.delete(id);

      return htmxRedirect(reply, '/admin/media/images?toast=deleted');
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to delete image.',
      }));
    }
  }

  async showBatchForm(request, reply) {
    try {
      const user = request.user;
      const albums = await albumsService.getAllForDropdown();

      const { imagesBatchContent, imagesBatchMeta } = await import('../templates/pages/media/images/index.js');

      return renderAdminPage(
        request,
        reply,
        imagesBatchMeta(),
        imagesBatchContent({ user, albums }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return renderFragment(reply, errorAlert({
        message: 'Failed to load batch upload form.',
      }));
    }
  }

  async batchUpload(request, reply) {
    try {
      const user = request.user;
      request.log.info('Starting batch image upload');

      const contentType = request.headers['content-type'];
      request.log.info(`Content-Type: ${contentType}`);

      if (!contentType || !contentType.includes('multipart/form-data')) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Invalid request format. Expected multipart/form-data.',
        }));
      }

      let parts;
      try {
        parts = request.parts();
        request.log.info('Multipart parser initialized successfully');
      } catch (parseError) {
        request.log.error('Failed to initialize multipart parser:', parseError);
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'Failed to parse upload request. Please try again.',
        }));
      }

      const files = [];
      let albumId = null;
      let partCount = 0;

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
        return renderFragment(reply, errorAlert({
          message: `Error parsing upload: ${parseLoopError.message || 'Unknown error'}`,
        }));
      }

      request.log.info(`Finished processing ${partCount} parts, ${files.length} files`);

      if (files.length === 0) {
        reply.code(400);
        return renderFragment(reply, errorAlert({
          message: 'No image files provided. Please select files to upload.',
        }));
      }

      request.log.info('Starting batch upload service');
      const results = await imagesService.batchUpload(files, {
        albumId: albumId || null,
      }, user.id);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      request.log.info(`Batch upload complete: ${successful.length} successful, ${failed.length} failed`);

      let message;
      if (failed.length === 0) {
        message = `Successfully uploaded ${successful.length} image${successful.length !== 1 ? 's' : ''}`;
      } else {
        message = `Uploaded ${successful.length} of ${files.length} images. ${failed.length} failed.`;
      }

      return htmxRedirect(reply, `/admin/media/images?toast=${encodeURIComponent(message)}`);
    } catch (error) {
      request.log.error('Batch upload error:', error);

      if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
        reply.code(413);
        return renderFragment(reply, errorAlert({
          message: 'One or more files exceed the 50MB size limit. Please compress your images or upload smaller files.',
        }));
      }

      reply.code(400);
      return renderFragment(reply, errorAlert({
        message: error.message || 'Failed to upload images.',
      }));
    }
  }
}

export const imagesController = new ImagesController();
