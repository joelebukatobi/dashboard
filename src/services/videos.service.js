// src/services/videos.service.js
// Videos service for managing video library with FFmpeg

import { db, mediaItems, posts } from '../db/index.js';
import { eq, like, desc, sql } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto';

/**
 * Videos Service
 * Handles video upload, processing with FFmpeg, and management
 */
class VideosService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public/uploads/videos');
    this.thumbsDir = path.join(this.uploadDir, 'thumbs');
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
   * Get all videos with pagination and filters
   * @param {Object} options - Query options
   * @param {string} [options.search] - Search by filename or title
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @returns {Promise<Object>} - { data, pagination }
   */
  async getAll({ search, page = 1, limit = 20 } = {}) {
    // Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${like(mediaItems.originalName, `%${search}%`)} OR ${like(mediaItems.title, `%${search}%`)})`
      );
    }

    // Filter by type = VIDEO
    conditions.push(eq(mediaItems.type, 'VIDEO'));

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(mediaItems);
    if (conditions.length > 0) {
      countQuery = countQuery.where(...conditions);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Build main query
    let query = db.select().from(mediaItems);
    
    if (conditions.length > 0) {
      query = query.where(...conditions);
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
   * Get video by ID
   * @param {string} id - Video ID
   * @returns {Promise<Object|null>} - Video or null
   */
  async getById(id) {
    const [video] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, id));

    return video || null;
  }

  /**
   * Get video metadata using FFmpeg
   * @param {string} filepath - Path to video file
   * @returns {Promise<Object>} - { duration, width, height }
   */
  async getVideoMetadata(filepath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          duration: Math.round(metadata.format.duration || 0),
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
        });
      });
    });
  }

  /**
   * Generate video thumbnail using FFmpeg
   * @param {string} videoPath - Path to video file
   * @param {string} outputPath - Path for thumbnail output
   * @returns {Promise<void>}
   */
  async generateThumbnail(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['1'], // Extract frame at 1 second
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '400x400', // Larger thumbnail for videos
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Upload and process video
   * @param {Object} file - File object from multipart
   * @param {Object} metadata - Video metadata (title, altText, tag)
   * @param {string} userId - Uploading user ID
   * @returns {Promise<Object>} - Created video record
   */
  async upload(file, metadata, userId) {
    await this.ensureDirectories();

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: MP4, MOV, WebM, AVI');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.filename.split('.').pop().toLowerCase();
    const filename = `video-${timestamp}-${random}.${extension}`;

    // File paths
    const filepath = path.join(this.uploadDir, filename);
    const thumbFilename = `thumb-${filename.replace(/\.[^.]+$/, '.jpg')}`;
    const thumbpath = path.join(this.thumbsDir, thumbFilename);

    // Save original file
    const buffer = await file.toBuffer();
    await fs.writeFile(filepath, buffer);

    // Process video with FFmpeg
    let width, height, duration;
    try {
      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(filepath);
      width = videoMetadata.width;
      height = videoMetadata.height;
      duration = videoMetadata.duration;

      // Generate thumbnail
      await this.generateThumbnail(filepath, thumbpath);
    } catch (err) {
      // Clean up on error
      await fs.unlink(filepath).catch(() => {});
      throw new Error(`Failed to process video: ${err.message}`);
    }

    const mediaId = crypto.randomUUID();

    // Create database record
    await db
      .insert(mediaItems)
      .values({
        id: mediaId,
        type: 'VIDEO',
        filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
        width,
        height,
        duration,
        title: metadata.title || file.filename,
        altText: metadata.altText || '',
        caption: metadata.caption || '',
        description: metadata.description || '',
        path: `/public/uploads/videos/${filename}`,
        thumbnailPath: `/public/uploads/videos/thumbs/${thumbFilename}`,
        uploadedBy: userId,
      });

    const [videoRecord] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, mediaId))
      .limit(1);

    return videoRecord;
  }

  /**
   * Update video metadata
   * @param {string} id - Video ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} - Updated video
   */
  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Video not found');
    }

    await db
      .update(mediaItems)
      .set({
        title: data.title,
        altText: data.altText,
        updatedAt: new Date(),
      })
      .where(eq(mediaItems.id, id));

    const [video] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, id))
      .limit(1);

    return video;
  }

  /**
   * Delete video
   * @param {string} id - Video ID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(id) {
    const video = await this.getById(id);
    if (!video) {
      throw new Error('Video not found');
    }

    // Delete files
    const filepath = path.join(process.cwd(), 'public', video.path);
    const thumbpath = video.thumbnailPath 
      ? path.join(process.cwd(), 'public', video.thumbnailPath)
      : null;

    await fs.unlink(filepath).catch(() => {});
    if (thumbpath) {
      await fs.unlink(thumbpath).catch(() => {});
    }

    // Delete database record
    await db.delete(mediaItems).where(eq(mediaItems.id, id));

    return true;
  }

  /**
   * Get video usage (which posts use this video)
   * @param {string} videoId - Video ID
   * @returns {Promise<Array>} - Posts using this video
   */
  async getUsage(videoId) {
    // Check if video is used as featured image
    const featuredPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
      })
      .from(posts)
      .where(eq(posts.featuredImageId, videoId));

    return featuredPosts;
  }

  /**
   * Get video statistics
   * @returns {Promise<Object>} - Stats
   */
  async getStats() {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'VIDEO'));

    const [{ totalSize }] = await db
      .select({ totalSize: sql`sum(size)` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'VIDEO'));

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
   * Attach video to post as featured video
   * @param {string} videoId - Video ID
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  async attachToPost(videoId, postId) {
    await db
      .update(posts)
      .set({
        featuredImageId: videoId,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  }

  /**
   * Format duration for display (seconds to MM:SS or HH:MM:SS)
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export const videosService = new VideosService();
