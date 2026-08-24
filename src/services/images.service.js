// src/services/images.service.js
// Images service for managing media library

import { db, mediaItems, posts, albums } from '../db/index.js';
import { eq, like, desc, asc, sql, and, isNull } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { resolveMediaFsPath, toPublicMediaUrl } from '../lib/media-paths.js';

/**
 * Images Service
 * Handles image upload, processing, and management
 */
class ImagesService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public/uploads/images');
    this.thumbsDir = path.join(this.uploadDir, 'thumbs');
    this.postsUploadDir = path.join(process.cwd(), 'public/uploads/posts');
    this.postsThumbsDir = path.join(this.postsUploadDir, 'thumbs');
  }

  /**
   * Ensure upload directories exist
   */
  async ensureDirectories() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
    
    try {
      await fs.access(this.thumbsDir);
    } catch {
      await fs.mkdir(this.thumbsDir, { recursive: true });
    }
  }

  /**
   * Get all images with pagination and filters
   * @param {Object} options - Query options
   * @param {string} [options.search] - Search by filename or title
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @returns {Promise<Object>} - { data, pagination }
   */
  async getAll({ search, page = 1, limit = 20 } = {}) {
    // Build query conditions
    const conditions = [];

    // Filter by type = IMAGE
    conditions.push(eq(mediaItems.type, 'IMAGE'));

    if (search) {
      conditions.push(
        sql`(${like(mediaItems.originalName, `%${search}%`)} OR ${like(mediaItems.title, `%${search}%`)})`
      );
    }

    // Combine conditions with AND
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(mediaItems);
    if (conditions.length > 0) {
      countQuery = countQuery.where(whereClause);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Build main query
    let query = db.select().from(mediaItems);
    
    if (conditions.length > 0) {
      query = query.where(whereClause);
    }

    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    query = query
      .orderBy(desc(mediaItems.createdAt))
      .limit(limit)
      .offset(offset);

    const data = await query;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get image by ID
   * @param {string} id - Image ID
   * @returns {Promise<Object|null>} - Image or null
   */
  async getById(id) {
    const [image] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, id));

    return image || null;
  }

  /**
   * Upload and process image
   * @param {Object} file - File object from multipart
   * @param {Object} metadata - Image metadata (title, altText, tag)
   * @param {string} userId - Uploading user ID
   * @returns {Promise<Object>} - Created image record
   */
  async upload(file, metadata, userId) {
    await this.ensureDirectories();

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.filename.split('.').pop().toLowerCase();
    const filename = `image-${timestamp}-${random}.${extension}`;

    // File paths
    const filepath = path.join(this.uploadDir, filename);
    const thumbFilename = `thumb-${filename}`;
    const thumbpath = path.join(this.thumbsDir, thumbFilename);

    // Save original file
    const buffer = await file.toBuffer();
    await fs.writeFile(filepath, buffer);

    // Process image with Sharp
    let width, height;
    try {
      const image = sharp(filepath);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;

      // Create thumbnail (200x200, fit within bounds)
      await image
        .resize(200, 200, { fit: 'cover' })
        .toFile(thumbpath);
    } catch (err) {
      // Clean up on error
      await fs.unlink(filepath).catch(() => {});
      throw new Error(`Failed to process image: ${err.message}`);
    }

    const mediaId = crypto.randomUUID();

    // Create database record
    await db
      .insert(mediaItems)
      .values({
        id: mediaId,
        type: 'IMAGE',
        filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
        width,
        height,
        title: metadata.title || file.filename,
        altText: metadata.altText || '',
        caption: metadata.caption || '',
        description: metadata.description || '',
        path: `/public/uploads/images/${filename}`,
        thumbnailPath: `/public/uploads/images/thumbs/${thumbFilename}`,
        uploadedBy: userId,
        albumId: metadata.albumId || null,
      });

    // Auto-assign as album cover if this is the first image in the album
    if (metadata.albumId) {
      const [album] = await db
        .select()
        .from(albums)
        .where(eq(albums.id, metadata.albumId))
        .limit(1);

      if (album && !album.coverImageId) {
        await db
          .update(albums)
          .set({ coverImageId: mediaId })
          .where(eq(albums.id, metadata.albumId));
      }
    }

    const [imageRecord] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, mediaId))
      .limit(1);

    return imageRecord;
  }

  /**
   * Ensure post editor upload directories exist
   */
  async ensurePostUploadDirectories() {
    for (const dir of [this.postsUploadDir, this.postsThumbsDir]) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Upload image from post editor (inline / featured) with deduplication
   * @param {Object} file - Multipart file
   * @param {string} userId - Uploading user ID
   * @returns {Promise<Object>} - { mediaItem, deduplicated, url }
   */
  async uploadForPost(file, userId) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
    }

    const maxSize = 10 * 1024 * 1024;
    const buffer = await file.toBuffer();
    if (buffer.length > maxSize) {
      throw new Error('File too large. Max size: 10MB');
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const [existingImage] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.hash, hash))
      .limit(1);

    if (existingImage) {
      return {
        mediaItem: existingImage,
        deduplicated: true,
        url: toPublicMediaUrl(existingImage.path),
      };
    }

    await this.ensurePostUploadDirectories();

    const timestamp = Date.now();
    const extension = file.filename.split('.').pop().toLowerCase();
    const filename = `post-${timestamp}.${extension}`;
    const filepath = path.join(this.postsUploadDir, filename);
    const thumbFilename = `thumb-${filename}`;
    const thumbpath = path.join(this.postsThumbsDir, thumbFilename);

    await fs.writeFile(filepath, buffer);

    let width;
    let height;
    try {
      const image = sharp(filepath);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;

      await image
        .resize(200, 200, { fit: 'cover' })
        .toFile(thumbpath);
    } catch (err) {
      await fs.unlink(filepath).catch(() => {});
      throw new Error(`Failed to process image: ${err.message}`);
    }

    const mediaId = crypto.randomUUID();

    await db
      .insert(mediaItems)
      .values({
        id: mediaId,
        type: 'IMAGE',
        filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
        width,
        height,
        path: `/public/uploads/posts/${filename}`,
        thumbnailPath: `/public/uploads/posts/thumbs/${thumbFilename}`,
        hash,
        uploadedBy: userId,
      });

    const [mediaItem] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, mediaId))
      .limit(1);

    return {
      mediaItem,
      deduplicated: false,
      url: toPublicMediaUrl(mediaItem.path),
    };
  }

  /**
   * Update image metadata
   * @param {string} id - Image ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} - Updated image
   */
  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Image not found');
    }

    const updateData = {
      title: data.title,
      altText: data.altText,
      updatedAt: new Date(),
    };
    if (data.albumId !== undefined) {
      updateData.albumId = data.albumId || null;
    }

    await db
      .update(mediaItems)
      .set(updateData)
      .where(eq(mediaItems.id, id));

    const [image] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, id))
      .limit(1);

    return image;
  }

  resolveMediaFsPath(storedPath) {
    return resolveMediaFsPath(storedPath);
  }

  /**
   * Delete image
   * @param {string} id - Image ID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(id) {
    const image = await this.getById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    // Clear references that block deletion (posts FK has no ON DELETE action)
    await db
      .update(posts)
      .set({ featuredImageId: null, updatedAt: new Date() })
      .where(eq(posts.featuredImageId, id));

    await db
      .update(albums)
      .set({ coverImageId: null, updatedAt: new Date() })
      .where(eq(albums.coverImageId, id));

    const filepath = this.resolveMediaFsPath(image.path);
    const thumbpath = this.resolveMediaFsPath(image.thumbnailPath);

    if (filepath) {
      await fs.unlink(filepath).catch(() => {});
    }
    if (thumbpath) {
      await fs.unlink(thumbpath).catch(() => {});
    }

    await db.delete(mediaItems).where(eq(mediaItems.id, id));

    return true;
  }

  /**
   * Get image usage (which posts use this image)
   * @param {string} imageId - Image ID
   * @returns {Promise<Array>} - Posts using this image
   */
  async getUsage(imageId) {
    // Check if image is used as featured image
    const featuredPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
      })
      .from(posts)
      .where(eq(posts.featuredImageId, imageId));

    return featuredPosts;
  }

  /**
   * Get image statistics
   * @returns {Promise<Object>} - Stats
   */
  async getStats() {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'IMAGE'));

    const [{ totalSize }] = await db
      .select({ totalSize: sql`sum(size)` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'IMAGE'));

    return {
      total: Number(count),
      totalSize: Number(totalSize) || 0,
    };
  }

  /**
   * Get all posts for attachment dropdown
   * @returns {Promise<Array>} - Posts with id and title
   */
  async getAllPostsForAttachment() {
    const allPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
      })
      .from(posts)
      .orderBy(desc(posts.createdAt));

    return allPosts;
  }

  /**
   * Attach image to post as featured image
   * @param {string} imageId - Image ID
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  async attachToPost(imageId, postId) {
    await db
      .update(posts)
      .set({
        featuredImageId: imageId,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  }

  /**
   * Batch upload multiple images
   * @param {Array<Object>} files - Array of file objects
   * @param {Object} metadata - Shared metadata (albumId)
   * @param {string} userId - Uploading user ID
   * @returns {Promise<Array>} - Results array with success/failure status
   */
  async batchUpload(files, metadata, userId) {
    const results = [];

    for (const file of files) {
      try {
        const image = await this.upload(file, {
          title: file.filename,
          altText: '',
          albumId: metadata.albumId || null,
        }, userId);

        results.push({
          success: true,
          filename: file.filename,
          image,
        });
      } catch (error) {
        results.push({
          success: false,
          filename: file.filename,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export const imagesService = new ImagesService();
