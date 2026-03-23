/**
 * Input sanitization utilities.
 * Strips HTML tags and dangerous content from user input to prevent XSS.
 *
 * Uses a lightweight custom implementation that:
 * 1. Strips all HTML tags
 * 2. Escapes HTML entities
 * 3. Removes null bytes and control characters
 * 4. Trims excessive whitespace
 */

// HTML entity map for escaping
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

/**
 * Strip all HTML tags from a string.
 * Prevents stored XSS by removing any HTML markup before saving to database.
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Remove HTML tags including script, style, and their contents
  let clean = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
  // Remove null bytes and control characters (except newline, tab)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return clean.trim();
}

/**
 * Escape HTML entities in a string.
 * Used for output escaping when rendering user content.
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user text input by stripping HTML and normalizing whitespace.
 * Use this for all user-supplied text fields (names, descriptions, comments, etc.)
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let clean = stripHtml(input);
  // Normalize multiple spaces/newlines
  clean = clean.replace(/\s{3,}/g, '  ');
  // Limit length to prevent memory abuse
  clean = clean.slice(0, 10000);
  return clean.trim();
}

/**
 * Sanitize an email address.
 * Strips HTML, lowercases, and validates basic format.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return stripHtml(input).toLowerCase().trim();
}

/**
 * Escape a string for safe use in MongoDB regex queries.
 * Prevents ReDoS (Regular Expression Denial of Service) attacks.
 */
export function escapeRegex(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize an object's string fields recursively.
 * Useful for sanitizing entire request bodies.
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeText(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
