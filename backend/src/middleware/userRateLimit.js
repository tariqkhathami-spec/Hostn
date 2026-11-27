/**
 * Small per-user, in-memory rate limiter for authenticated routes
 * (must run after protect). Per instance, which is enough to stop a stuck
 * client or a stolen session from running up an AI bill or guessing codes.
 */
function userRateLimit({ name, windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const id = req.user?._id ? String(req.user._id) : req.ip;
    const key = `${name}:${id}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

module.exports = userRateLimit;
