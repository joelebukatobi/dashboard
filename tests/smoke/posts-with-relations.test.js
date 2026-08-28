import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// getPostWithRelations is the single definition of the "one post plus its
// author, category and tags" query. The public API used to carry its own copy,
// which is how a media-URL fix reached the admin preview but not the published
// site. These cover the two things that must not drift: the column set both
// callers depend on, and the status filter that keeps drafts off the public API.

const { ensureDatabaseUrl } = await import('../../env.js');
ensureDatabaseUrl({ scriptName: 'posts-with-relations.test' });

const { postsService } = await import('../../src/services/posts.service.js');
const { db, posts, users } = await import('../../src/db/index.js');
const { eq } = await import('drizzle-orm');

describe('getPostWithRelations', () => {
  let draftSlug;
  let adminId;

  beforeAll(async () => {
    const [admin] = await db.select().from(users).limit(1);
    adminId = admin?.id;
    if (!adminId) return;
    draftSlug = `draft-relations-test-${Date.now()}`;
    await postsService.createPost(
      {
        title: 'Draft relations test',
        slug: draftSlug,
        content: 'body',
        excerpt: '',
        categoryId: '',
        featuredImageId: '',
        status: 'DRAFT',
        tagIds: [],
      },
      adminId,
    );
  });

  afterAll(async () => {
    if (draftSlug) await db.delete(posts).where(eq(posts.slug, draftSlug));
  });

  it('hides a non-published post when a status filter is given', async () => {
    const viaPublicApi = await postsService.getPostWithRelations({
      slug: draftSlug,
      status: 'PUBLISHED',
    });
    expect(viaPublicApi).toBeNull();
  });

  it('returns the same post to the admin, which applies no status filter', async () => {
    const viaAdmin = await postsService.getPostWithRelations({ slug: draftSlug });
    expect(viaAdmin).not.toBeNull();
    expect(viaAdmin.slug).toBe(draftSlug);
  });

  it('requires an id or a slug', async () => {
    await expect(postsService.getPostWithRelations({})).rejects.toThrow(/id or a slug/);
  });

  it('selects the columns formatPostForAPI maps, not just the admin subset', async () => {
    const post = await postsService.getPostWithRelations({ slug: draftSlug });

    // The API renders author avatars and created/updated timestamps for every
    // relation. Narrowing this select back to the admin's subset would return
    // nulls in the public JSON rather than failing loudly.
    expect(Object.keys(post.author)).toEqual(
      expect.arrayContaining(['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'createdAt', 'updatedAt']),
    );
    expect(post).toHaveProperty('featuredImageUrl');
    expect(post).toHaveProperty('featuredImageThumbnailUrl');
  });
});

// getAllPosts is the single definition of the "page of posts plus relations"
// query. The public API used to carry its own copy with a wider column set,
// which is the same split that let a media-URL fix reach one path and not the
// other. These pin the columns and relations the API depends on.
describe('getAllPosts', () => {
  it('returns the author columns the public API maps', async () => {
    const { posts: rows } = await postsService.getAllPosts({ limit: 1, page: 1 });
    if (rows.length === 0) return;

    expect(Object.keys(rows[0].author ?? {})).toEqual(
      expect.arrayContaining([
        'id', 'firstName', 'lastName', 'email', 'avatarUrl', 'createdAt', 'updatedAt',
      ]),
    );
  });

  it('attaches tags and image urls, which the API needs and the admin ignores', async () => {
    const { posts: rows } = await postsService.getAllPosts({ limit: 1, page: 1 });
    if (rows.length === 0) return;

    expect(Array.isArray(rows[0].tags)).toBe(true);
    expect(rows[0]).toHaveProperty('featuredImageUrl');
    expect(rows[0]).toHaveProperty('featuredImageThumbnailUrl');
  });

  it('keeps the shape the admin posts list destructures', async () => {
    const result = await postsService.getAllPosts({ limit: 1, page: 1 });
    expect(result).toHaveProperty('posts');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('totalPages');
  });
});

// The public API used to filter by tag in JavaScript after the page was
// fetched, so a tag filter could only remove rows from the rows already in
// hand, and meta.total counted unfiltered rows. An unknown category slug was
// worse: the filter was silently dropped and every post came back.
describe('getAllPosts filtering', () => {
  it('returns nothing for a category slug that does not exist', async () => {
    const { posts: rows, total } = await postsService.getAllPosts({
      status: 'PUBLISHED',
      categorySlug: 'definitely-not-a-real-category',
      limit: 10,
      page: 1,
    });
    expect(rows).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('returns nothing for a tag slug that does not exist', async () => {
    const { posts: rows, total } = await postsService.getAllPosts({
      status: 'PUBLISHED',
      tagSlug: 'definitely-not-a-real-tag',
      limit: 10,
      page: 1,
    });
    expect(rows).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('counts the filtered rows, so pagination reflects the filter', async () => {
    const { total: unfiltered } = await postsService.getAllPosts({
      status: 'PUBLISHED',
      limit: 1,
      page: 1,
    });
    const { total: filtered } = await postsService.getAllPosts({
      status: 'PUBLISHED',
      categorySlug: 'definitely-not-a-real-category',
      limit: 1,
      page: 1,
    });

    expect(filtered).toBe(0);
    expect(filtered).not.toBe(unfiltered);
  });

  it('never returns a post twice when it carries several tags', async () => {
    const { db } = await import('../../src/db/index.js');
    const { tags } = await import('../../src/db/schema.js');
    const [tag] = await db.select().from(tags).limit(1);
    if (!tag) return;

    // EXISTS rather than a join: joining would emit one row per matching tag.
    const { posts: rows } = await postsService.getAllPosts({
      status: 'PUBLISHED',
      tagSlug: tag.slug,
      limit: 50,
      page: 1,
    });
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
