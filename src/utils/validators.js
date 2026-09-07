// src/utils/validators.js
import { z } from 'zod';

/**
 * Email validation schema
 * - Must look like an email
 * - Max 255 characters
 * - Converted to lowercase
 *
 * The format check used to live only in auth.service validateCredentials,
 * which covers login but not the public subscribe endpoint or comment author
 * addresses, so POST /api/v1/subscribe happily stored values like "nope".
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .transform(email => email.toLowerCase().trim());

/**
 * Password validation schema
 * Note: Strength validation is handled in auth service for specific error messages
 */
export const passwordSchema = z
  .string()
  .min(1, 'Password is required');

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.enum(['true', 'false']).default('false').transform(val => val === 'true')
});

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .transform(name => name.trim()),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .transform(name => name.trim()),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).default('VIEWER')
});

/**
 * Validate data against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {object} data - Data to validate
 * @returns {object} - { success: boolean, data?: object, errors?: string[] }
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format Zod errors into readable messages
  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  
  return { success: false, errors };
}

/**
 * Sanitize HTML to prevent XSS
 * Basic sanitization - removes script tags and event handlers
 * @param {string} html - HTML string
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  
  return html
    // Remove script tags and their content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
}

/**
 * Validate and sanitize user input
 * @param {object} input - Raw input object
 * @param {string[]} allowedFields - List of allowed field names
 * @returns {object} - Sanitized input
 */
export function sanitizeUserInput(input, allowedFields) {
  const sanitized = {};
  
  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      if (typeof input[field] === 'string') {
        sanitized[field] = input[field].trim();
      } else {
        sanitized[field] = input[field];
      }
    }
  }
  
  return sanitized;
}
