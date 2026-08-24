import slugify from 'slugify';

export function slugifyPostTitle(title) {
  return slugify(String(title || ''), { lower: true, strict: true, trim: true });
}

export function normalizeOptionalId(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function parsePostTagIds(data) {
  const raw = data?.tags ?? data?.tagIds;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

export function preprocessPostBody(data) {
  const input = typeof data === 'object' && data !== null ? { ...data } : {};
  const title = typeof input.title === 'string' ? input.title.trim() : input.title;
  let slug = typeof input.slug === 'string' ? input.slug.trim() : '';

  if (!slug && typeof title === 'string' && title) {
    slug = slugifyPostTitle(title);
  }

  const categoryId = normalizeOptionalId(input.categoryId);
  const featuredImageId = normalizeOptionalId(input.featuredImageId);
  const tags = input.tags ?? input.tagIds;

  const result = {
    ...input,
    title,
    categoryId: categoryId ?? undefined,
    featuredImageId: featuredImageId ?? undefined,
    tags,
  };

  if (slug || typeof input.slug === 'string') {
    result.slug = slug;
  } else {
    delete result.slug;
  }

  return result;
}
