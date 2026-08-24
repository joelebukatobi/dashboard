import { z } from 'zod';

export const resourceIdSchema = z.object({
  id: z.string().min(1).max(36),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(255),
});

export const postIdParamSchema = z.object({
  postId: z.string().min(1).max(36),
});

export const commentParamsSchema = z.object({
  postId: z.string().min(1).max(36),
  id: z.string().min(1).max(36),
});

export const commentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  toast: z.string().max(200).optional(),
});

export const slugQuerySchema = z.object({
  slug: z.string().min(1).max(255),
  excludeId: z.string().max(36).optional(),
});

const optionalString = z.string().max(500).optional().or(z.literal(''));

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: optionalString,
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  toast: z.string().max(200).optional(),
});

export const postsListQuerySchema = listQuerySchema.extend({
  status: z.string().max(50).optional(),
  categoryId: z.string().max(36).optional(),
  category: z.string().max(255).optional(),
});

export const usersListQuerySchema = listQuerySchema.extend({
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});

export const subscribersListQuerySchema = listQuerySchema.extend({
  status: z.string().max(50).optional(),
});

export const apiPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  category: z.string().max(255).optional(),
  tag: z.string().max(255).optional(),
});

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  category: z.string().max(255).optional(),
  tag: z.string().max(255).optional(),
  year: z.coerce.number().int().optional(),
  search: z.string().max(255).optional(),
});

export const apiCommentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export function formatZodError(error) {
  return error.errors
    .map((err) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join(', ');
}

/**
 * Map Zod issues to field error messages (joins multiple issues per field).
 * @param {import('zod').ZodError} error
 * @returns {Record<string, string>}
 */
export function mapZodErrorsToFields(error) {
  /** @type {Record<string, string>} */
  const errors = {};

  for (const issue of error.errors) {
    const key = issue.path[0];
    if (typeof key === 'string') {
      errors[key] = errors[key] ? `${errors[key]}. ${issue.message}` : issue.message;
    }
  }

  return errors;
}
