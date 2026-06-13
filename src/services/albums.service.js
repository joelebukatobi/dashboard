// src/services/albums.service.js
// Albums service for managing media albums

import { db, albums, mediaItems } from '../db/index.js';
import { eq, like, desc, asc, sql, isNull, and } from 'drizzle-orm';

/**
 * Albums Service
 * Handles album CRUD operations
 */
class AlbumsService {
  /**
   * Get all albums with optional filtering and pagination
   */
  async getAll({
    search,
    page = 1,
    limit = 10,
  } = {}) {
    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${like(albums.title, `%${search}%`)} OR ${like(albums.slug, `%${search}%`)})`
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(albums);
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Build main query with cover image join
    let query = db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        description: albums.description,
        coverImageId: albums.coverImageId,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        coverImage: {
          id: mediaItems.id,
          path: mediaItems.path,
          thumbnailPath: mediaItems.thumbnailPath,
        },
      })
      .from(albums)
      .leftJoin(mediaItems, eq(albums.coverImageId, mediaItems.id));

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query.orderBy(desc(albums.createdAt));

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const data = await query;

    // For albums without a cover, try to use the first image in the album
    const albumsWithCovers = await Promise.all(
      data.map(async (album) => {
        if (album.coverImage && album.coverImage.path) {
          return album;
        }

        // Try to get the first image in this album
        const [firstImage] = await db
          .select({
            id: mediaItems.id,
            path: mediaItems.path,
            thumbnailPath: mediaItems.thumbnailPath,
          })
          .from(mediaItems)
          .where(
            and(
              eq(mediaItems.albumId, album.id),
              eq(mediaItems.type, 'IMAGE')
            )
          )
          .orderBy(desc(mediaItems.createdAt))
          .limit(1);

        if (firstImage) {
          return {
            ...album,
            coverImage: firstImage,
          };
        }

        // No images - mark as needing placeholder
        return {
          ...album,
          coverImage: null,
        };
      })
    );

    return {
      data: albumsWithCovers,
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
   * Get all albums for dropdown (no pagination)
   */
  async getAllForDropdown() {
    return db
      .select({
        id: albums.id,
        title: albums.title,
      })
      .from(albums)
      .orderBy(asc(albums.title));
  }

  /**
   * Get album by ID with media count
   */
  async getById(id) {
    const [album] = await db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        description: albums.description,
        coverImageId: albums.coverImageId,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
      })
      .from(albums)
      .where(eq(albums.id, id));

    if (!album) return null;

    // Get media count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(mediaItems)
      .where(eq(mediaItems.albumId, id));

    const mediaCount = Number(count);

    // Get cover image if set
    let coverImage = null;
    if (album.coverImageId) {
      const [image] = await db
        .select({
          id: mediaItems.id,
          path: mediaItems.path,
          thumbnailPath: mediaItems.thumbnailPath,
        })
        .from(mediaItems)
        .where(eq(mediaItems.id, album.coverImageId))
        .limit(1);
      coverImage = image || null;
    }

    // If no cover image, try to get the first image in the album
    if (!coverImage && mediaCount > 0) {
      const [firstImage] = await db
        .select({
          id: mediaItems.id,
          path: mediaItems.path,
          thumbnailPath: mediaItems.thumbnailPath,
        })
        .from(mediaItems)
        .where(
          and(
            eq(mediaItems.albumId, id),
            eq(mediaItems.type, 'IMAGE')
          )
        )
        .orderBy(desc(mediaItems.createdAt))
        .limit(1);
      coverImage = firstImage || null;
    }

    return { ...album, mediaCount, coverImage };
  }

  /**
   * Get album by slug
   */
  async getBySlug(slug) {
    const [album] = await db
      .select()
      .from(albums)
      .where(eq(albums.slug, slug));

    return album || null;
  }

  /**
   * Get media items in an album
   */
  async getAlbumMedia(albumId, { page = 1, limit = 20 } = {}) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(mediaItems)
      .where(eq(mediaItems.albumId, albumId));

    const total = Number(count);

    const data = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.albumId, albumId))
      .orderBy(desc(mediaItems.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new album
   */
  async create(data) {
    let { slug } = data;
    if (!slug) {
      slug = this.generateSlug(data.title);
    }

    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new Error('An album with this slug already exists');
    }

    await db.insert(albums).values({
      title: data.title,
      slug,
      description: data.description || null,
      coverImageId: data.coverImageId || null,
    });

    const [album] = await db
      .select()
      .from(albums)
      .where(eq(albums.slug, slug))
      .limit(1);

    return album;
  }

  /**
   * Update an album
   */
  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Album not found');
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImageId !== undefined) updateData.coverImageId = data.coverImageId;

    if (data.slug) {
      const existingSlug = await this.getBySlug(data.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new Error('An album with this slug already exists');
      }
      updateData.slug = data.slug;
    }

    await db.update(albums).set(updateData).where(eq(albums.id, id));

    const [album] = await db
      .select()
      .from(albums)
      .where(eq(albums.id, id))
      .limit(1);

    return album;
  }

  /**
   * Delete an album (media items become unassigned)
   */
  async delete(id) {
    const album = await this.getById(id);
    if (!album) {
      throw new Error('Album not found');
    }

    await db.delete(albums).where(eq(albums.id, id));
    return { deleted: true };
  }

  /**
   * Generate a URL-friendly slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const albumsService = new AlbumsService();
export default albumsService;
