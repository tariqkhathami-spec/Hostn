/**
 * Content filter for chat messages.
 * Detects and masks phone numbers, emails, URLs, and social media handles
 * to prevent off-platform communication.
 */

// Patterns to detect
const PATTERNS = {
  // Saudi phone: +966, 05, 5xxxxxxxx, or any 8+ digit sequence
  saudiPhone: /(?:\+?966|0)?5\d{8}/g,
  // International phone: any 8+ consecutive digits (with optional separators)
  phone: /(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // URLs (http, https, www)
  url: /(?:https?:\/\/|www\.)[^\s<]+/gi,
  // WhatsApp specific
  whatsapp: /(?:wa\.me|whatsapp\.com|واتس|واتساب|whatsapp|watsap)/gi,
  // Social media handles
  social: /(?:@[a-zA-Z0-9_]{3,}|(?:instagram|telegram|snapchat|snap|twitter|تليجرام|انستقرام|سناب)[\s.:]*[a-zA-Z0-9_@]+)/gi,
};

const MASK = '***';

/**
 * Check if content contains restricted contact information
 * @param {string} content - Message content
 * @returns {{ hasViolation: boolean, violations: string[], filtered: string }}
 */
function filterContent(content) {
  if (!content || typeof content !== 'string') {
    return { hasViolation: false, violations: [], filtered: content || '' };
  }

  let filtered = content;
  const violations = [];

  // Check each pattern
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push(type);
      filtered = filtered.replace(pattern, MASK);
    }
  }

  // Also detect digit sequences of 7+ digits (catches creative phone number formats)
  const digitOnly = content.replace(/[^\d]/g, '');
  if (digitOnly.length >= 7 && !violations.includes('phone') && !violations.includes('saudiPhone')) {
    // Check if the message has 7+ consecutive-ish digits
    if (/\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d[\s.\-\/]*\d/.test(content)) {
      violations.push('phone');
      filtered = content.replace(/(\d[\s.\-\/]*){7,}/g, MASK);
    }
  }

  return {
    hasViolation: violations.length > 0,
    violations,
    filtered,
  };
}

/**
 * Get warning message for the user
 */
function getViolationMessage(violations) {
  if (violations.includes('phone') || violations.includes('saudiPhone')) {
    return 'Sharing phone numbers is not allowed. All communication should stay within the platform for your safety.';
  }
  if (violations.includes('email')) {
    return 'Sharing email addresses is not allowed. Please use the in-app messaging.';
  }
  if (violations.includes('url') || violations.includes('whatsapp')) {
    return 'Sharing external links is not allowed to protect both guests and hosts.';
  }
  if (violations.includes('social')) {
    return 'Sharing social media contacts is not allowed. Please keep communication on the platform.';
  }
  return 'This message contains restricted content that has been filtered.';
}

module.exports = { filterContent, getViolationMessage };
