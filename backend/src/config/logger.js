/**
 * Structured logger.
 * In production: JSON format for log aggregation.
 * In development: Human-readable format.
 */
const isProduction = process.env.NODE_ENV === 'production';

function formatLog(level, message, meta = {}) {
  if (isProduction) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
  debug(message, meta) {
    if (!isProduction) {
      console.debug(formatLog('debug', message, meta));
    }
  },
};

module.exports = logger;
