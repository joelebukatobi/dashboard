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
