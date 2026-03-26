const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Strip ALL HTML/script from user input. Returns plain text only.
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Strip control characters and normalize whitespace.
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Escape regex-unsafe characters for safe use in $regex queries.
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { sanitizeHtml, sanitizeText, escapeRegex };
