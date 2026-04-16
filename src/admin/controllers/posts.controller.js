// src/admin/controllers/posts.controller.js
import { postsService } from '../../services/posts.service.js';
import { db, categories, tags } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { imagesService } from '../../services/images.service.js';
import { videosService } from '../../services/videos.service.js';
import crypto from 'crypto';

/**
 * Posts Controller
 * Handles post-related HTTP requests
 */
class PostsController {
  /**
   * GET /admin/posts
   * Display posts list page
   */
  async listPosts(request, reply) {
    try {
      const { 
        page = 1, 
        status, 
        category: categoryId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        toast,
      } = request.query;

      // Get posts with pagination
      const { posts, total, totalPages } = await postsService.getAllPosts({
        page: parseInt(page),
        status,
        categoryId,
        search,
        sortBy,
        sortOrder,
        limit: 10,
      });

      // Get categories for filter dropdown
      const allCategories = await db.select().from(categories);

      // Get counts by status
      const totalPosts = await postsService.getPostsCount();
      const publishedCount = await postsService.getPostsCount({ status: 'PUBLISHED' });
      const draftCount = await postsService.getPostsCount({ status: 'DRAFT' });
      const scheduledCount = await postsService.getPostsCount({ status: 'SCHEDULED' });

      const data = {
        posts,
        total,
        page: parseInt(page),
        totalPages,
        categories: allCategories,
        statusCounts: {
          total: totalPosts,
          published: publishedCount,
          draft: draftCount,
          scheduled: scheduledCount,
        },
        filters: {
          status,
          categoryId,
          search,
          sortBy,
          sortOrder,
        },
        user: request.user,
        toast,
      };

      // Check if HTMX request - return only table fragment
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        return reply.type('text/html').send(postsTableFragment(data));
      }

      // Import template
      const { postsListPage } = await import('../templates/pages/posts/index.js');

      return reply.type('text/html').send(postsListPage(data));

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load posts. Please try again.'
      }));
    }
  }

  /**
   * GET /admin/posts/new
   * Display new post form
   */
  async showNewPostForm(request, reply) {
    try {
      // Get categories and tags for form
      const allCategories = await db.select().from(categories);
      const allTags = await db.select().from(tags);

      const data = {
        categories: allCategories,
        tags: allTags,
        post: null,
        user: request.user,
      };

      const { postNewPage } = await import('../templates/pages/posts/index.js');

      return reply.type('text/html').send(postNewPage(data));

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load post form. Please try again.'
      }));
    }
  }

  /**
   * POST /admin/posts
   * Create new post
   */
  async createPost(request, reply) {
    try {
      const {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tags: tagIdsString,
        status = 'DRAFT',
        metaTitle,
        metaDescription,
      } = request.body;

      // Validate required fields
      if (!title || !slug || !content) {
        reply.code(400);
        return reply.type('text/html').send(errorFragment({
          message: 'Title, slug, and content are required'
        }));
      }

      // Parse tags - handle both array (from multi-select) and comma-separated string
      const tagIds = Array.isArray(tagIdsString)
        ? tagIdsString.filter(Boolean)
        : tagIdsString
          ? tagIdsString.split(',').filter(Boolean)
          : [];

      // Create post
      const post = await postsService.createPost({
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tagIds,
        status,
        metaTitle,
        metaDescription,
      }, request.user.id);

      // Send location for delayed redirect + toast trigger
      reply.header('HX-Location', `/admin/posts/${post.id}/edit`);
      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: status === 'PUBLISHED' ? 'Post published successfully!' : 'Draft saved successfully!', type: 'success' } }));
      return reply.type('text/html').send('');

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to create post. Please try again.'
      }));
    }
  }

  /**
   * GET /admin/posts/:id/edit
   * Display edit post form
   */
  async showEditPostForm(request, reply) {
    try {
      const { id } = request.params;
      
      const post = await postsService.getPostById(id);
      
      if (!post) {
        reply.code(404);
        return reply.type('text/html').send(errorFragment({
          message: 'Post not found'
        }));
      }

      // Get categories and tags for form
      const allCategories = await db.select().from(categories);
      const allTags = await db.select().from(tags);

      const data = {
        categories: allCategories,
        tags: allTags,
        post,
        user: request.user,
      };

      const { postEditPage } = await import('../templates/pages/posts/index.js');

      return reply.type('text/html').send(postEditPage(data));

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(errorFragment({
        message: 'Failed to load post. Please try again.'
      }));
    }
  }

  /**
   * PUT /admin/posts/:id
   * Update existing post
   */
  async updatePost(request, reply) {
    try {
      const { id } = request.params;
      const {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tags: tagIdsString,
        status,
        metaTitle,
        metaDescription,
      } = request.body;

      // Validate required fields
      if (!title || !slug || !content) {
        reply.code(400);
        return reply.type('text/html').send(errorFragment({
          message: 'Title, slug, and content are required'
        }));
      }

      // Parse tags - handle both array (from multi-select) and comma-separated string
      const tagIds = Array.isArray(tagIdsString)
        ? tagIdsString.filter(Boolean)
        : tagIdsString
          ? tagIdsString.split(',').filter(Boolean)
          : undefined;

      // Update post
      const post = await postsService.updatePost(id, {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tagIds,
        status,
        metaTitle,
        metaDescription,
      });

      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: status === 'PUBLISHED' ? 'Post updated and published!' : 'Draft updated successfully!', type: 'success' } }));
      return reply.type('text/html').send('');

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to update post. Please try again.'
      }));
    }
  }

  /**
   * DELETE /admin/posts/:id
   * Delete post
   */
  async deletePost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.deletePost(id);

      // Full browser redirect with toast param (avoids isHtmx fragment response)
      reply.header('HX-Redirect', '/admin/posts?toast=deleted');
      return reply.type('text/html').send('');

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to delete post. Please try again.'
      }));
    }
  }

  /**
   * POST /admin/posts/:id/publish
   * Quick publish action
   */
  async publishPost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.updatePost(id, { status: 'PUBLISHED' });

      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Post published successfully!', type: 'success' } }));
      return reply.type('text/html').send(successToast({
        message: 'Post published successfully!'
      }));

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to publish post.'
      }));
    }
  }

  /**
   * POST /admin/posts/:id/unpublish
   * Quick unpublish action
   */
  async unpublishPost(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.updatePost(id, { status: 'DRAFT' });

      reply.header('HX-Trigger', JSON.stringify({ "htmx:toast": { message: 'Post moved to drafts', type: 'success' } }));
      return reply.type('text/html').send(successToast({
        message: 'Post moved to drafts'
      }));

    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.type('text/html').send(errorFragment({
        message: error.message || 'Failed to unpublish post.'
      }));
    }
  }

  /**
   * POST /admin/posts/upload-image
   * Upload featured image with hash-based deduplication
   */
  async uploadImage(request, reply) {
    try {
      // Get uploaded file from multipart form
      const file = await request.file();
      
      if (!file) {
        reply.code(400);
        return reply.send({ error: 'No image file provided' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        reply.code(400);
        return reply.send({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' });
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.file.bytesRead > maxSize) {
        reply.code(400);
        return reply.send({ error: 'File too large. Max size: 10MB' });
      }

      // Read file buffer
      const fs = await import('fs/promises');
      const path = await import('path');
      const crypto = await import('crypto');
      const fileBuffer = await file.toBuffer();

      // Calculate SHA-256 hash of file content
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check if image with this hash already exists
      const { db, mediaItems } = await import('../../db/index.js');
      const { eq } = await import('drizzle-orm');
      
      const existingImage = await db
        .select({
          id: mediaItems.id,
          path: mediaItems.path,
          filename: mediaItems.filename,
        })
        .from(mediaItems)
        .where(eq(mediaItems.hash, hash))
        .limit(1);

      // If duplicate found, return existing image
      if (existingImage.length > 0) {
        return reply.send({
          id: existingImage[0].id,
          url: `/${existingImage[0].path}`,
          filename: existingImage[0].filename,
          deduplicated: true,
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.filename.split('.').pop();
      const filename = `post-${timestamp}.${extension}`;
      const filepath = `public/uploads/posts/${filename}`;

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'public/uploads/posts');
      
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Save file
      const fullPath = path.join(process.cwd(), filepath);
      await fs.writeFile(fullPath, fileBuffer);

      // Create media record in database with hash
      const mediaItemId = crypto.randomUUID();

      await db
        .insert(mediaItems)
        .values({
          id: mediaItemId,
          type: 'IMAGE',
          filename,
          originalName: file.filename,
          mimeType: file.mimetype,
          size: file.file.bytesRead,
          path: filepath,
          hash, // Store the hash for future deduplication
          uploadedBy: request.user.id,
        });

      const [mediaItem] = await db
        .select()
        .from(mediaItems)
        .where(eq(mediaItems.id, mediaItemId))
        .limit(1);

      return reply.send({
        id: mediaItem.id,
        url: `/${filepath}`,
        filename,
        deduplicated: false,
      });

    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to upload image' });
    }
  }

  /**
   * POST /admin/posts/upload-video
   * Upload inline video for editor insertion
   */
  async uploadVideo(request, reply) {
    try {
      const file = await request.file();

      if (!file) {
        reply.code(400);
        return reply.send({ error: 'No video file provided' });
      }

      const video = await videosService.upload(
        file,
        {
          title: file.filename,
          altText: '',
          caption: '',
          description: '',
        },
        request.user.id,
      );

      return reply.send({
        id: video.id,
        url: video.path,
        thumbnailUrl: video.thumbnailPath,
        mimeType: video.mimeType,
        title: video.title,
        duration: video.duration,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return reply.send({ error: error.message || 'Failed to upload video' });
    }
  }

  /**
   * GET /admin/posts/media/images
   * List images for editor media picker
   */
  async listEditorImages(request, reply) {
    try {
      const { search = '', page = 1, limit = 12 } = request.query;
      const result = await imagesService.getAll({
        search: search || undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      return reply.send({
        items: result.data.map((image) => ({
          id: image.id,
          url: image.path,
          thumbnailUrl: image.thumbnailPath || image.path,
          title: image.title || image.originalName || image.filename,
          altText: image.altText || '',
          mimeType: image.mimeType,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch images' });
    }
  }

  /**
   * GET /admin/posts/media/videos
   * List videos for editor media picker
   */
  async listEditorVideos(request, reply) {
    try {
      const { search = '', page = 1, limit = 12 } = request.query;
      const result = await videosService.getAll({
        search: search || undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      return reply.send({
        items: result.data.map((video) => ({
          id: video.id,
          url: video.path,
          thumbnailUrl: video.thumbnailPath || '',
          title: video.title || video.originalName || video.filename,
          mimeType: video.mimeType,
          duration: video.duration || 0,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch videos' });
    }
  }

  /**
   * GET /admin/posts/check-slug
   * Check if slug is available
   */
  async checkSlug(request, reply) {
    try {
      const { slug, excludeId } = request.query;
      
      if (!slug) {
        return reply.send({ available: false });
      }

      const existing = await postsService.getPostBySlug(slug);
      
      const available = !existing || existing.id === excludeId;
      
      return reply.send({ available });

    } catch (error) {
      request.log.error(error);
      return reply.send({ available: false });
    }
  }

  /**
   * POST /admin/posts/:id/view
   * Increment post view count
   * Public endpoint for blog tracking
   */
  async incrementViewCount(request, reply) {
    try {
      const { id } = request.params;
      
      await postsService.incrementViewCount(id);
      
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to track view' });
    }
  }
}

// Posts table fragment for HTMX partial responses (search, filters)
function postsTableFragment({ posts, page, totalPages, filters }) {
  if (!posts || posts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="file-text"></i>
        </div>
        <h3 class="empty-state__title">No posts found</h3>
        <p class="empty-state__description">Try adjusting your search or filters.</p>
      </div>
    `;
  }

  const rows = posts.map((post) => {
    const statusConfig = {
      PUBLISHED: { class: 'status--success', label: 'Published' },
      DRAFT: { class: 'status--warning', label: 'Draft' },
      SCHEDULED: { class: 'status--info', label: 'Scheduled' },
      ARCHIVED: { class: 'status--neutral', label: 'Archived' },
    };
    const config = statusConfig[post.status] || statusConfig['DRAFT'];
    const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <tr class="table__tr">
        <td class="table__td">
          <span class="table__label">Title</span>
          <div class="table__title">
            <a href="/admin/posts/${post.id}/edit">${escapeHtmlHelper(post.title)}</a>
          </div>
        </td>
        <td class="table__td">
          <span class="table__label">Category</span>
          ${post.category ? `<span class="text-grey-700">${post.category.title}</span>` : '<span class="text-grey-500">Uncategorized</span>'}
        </td>
        <td class="table__td">
          <span class="table__label">Status</span>
          <span class="status ${config.class}">
            <span class="status__dot"></span>
            ${config.label}
          </span>
        </td>
        <td class="table__td">
          <span class="table__label">Date</span>
          ${date}
        </td>
        <td class="table__td table__td--actions">
          <div class="flex items-center justify-end gap-[1.6rem] lg:gap-[0.64rem]">
            <a href="/admin/posts/${post.id}/edit" class="btn btn--ghost row-action row-action--edit">
              <i data-lucide="pencil" class="h-[1.4rem] w-[1.4rem] lg:h-[1.2rem] lg:w-[1.2rem]"></i>
              <span class="lg:hidden">Edit</span>
            </a>
            <button 
              type="button"
              class="btn btn--ghost row-action row-action--delete"
              data-post-id="${post.id}"
              data-post-title="${escapeHtmlHelper(post.title)}"
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
  const paginationFragment = totalPages > 1 ? fragmentPaginationHtml({ page, totalPages, filters }) : '';

  return `
    <table class="table">
      <thead class="table__thead">
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Status</th>
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
  if (filters?.categoryId) params.set('category', filters.categoryId);
  if (filters?.search) params.set('search', filters.search);

  const baseQuery = params.toString();
  const queryPrefix = baseQuery ? `&${baseQuery}` : '';

  let links = '';

  // Previous button
  const prevDisabled = page <= 1 ? 'pagination__item--disabled' : '';
  const prevHref = page > 1 ? `/admin/posts?page=${page - 1}${queryPrefix}` : '#';
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
      links += `<a href="/admin/posts?page=${p}${queryPrefix}" class="pagination__item ${active}">${p}</a>`;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages ? 'pagination__item--disabled' : '';
  const nextHref = page < totalPages ? `/admin/posts?page=${page + 1}${queryPrefix}` : '#';
  links += `<a href="${nextHref}" class="pagination__item ${nextDisabled}"><i data-lucide="chevron-right"></i></a>`;

  return `
    <footer class="page-footer">
      <div class="pagination">
        ${links}
      </div>
    </footer>
  `;
}

function escapeHtmlHelper(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper functions for fragments
function errorFragment({ message }) {
  return `
    <div class="alert alert--error alert--mb" role="alert">
      <i data-lucide="alert-circle" class="alert__icon"></i>
      <span class="alert__message">${message}</span>
    </div>
  `;
}

function successFragment({ message }) {
  return `
    <div class="alert alert--success alert--mb" role="alert">
      <i data-lucide="check-circle" class="alert__icon"></i>
      <span class="alert__message">${message}</span>
    </div>
  `;
}

function successToast({ message }) {
  return `
    <div class="alert alert--success alert--mb" role="alert">
      <i data-lucide="check-circle" class="alert__icon"></i>
      <span class="alert__message">${message}</span>
    </div>
  `;
}

// Export singleton
export const postsController = new PostsController();
export default postsController;
