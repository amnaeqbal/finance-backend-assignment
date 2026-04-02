// simple in-memory rate limiter — no need for redis at this scale
// tracks request counts per IP, resets after the window expires

function rateLimiter(maxRequests, windowMs) {
  const requests = new Map();

  // clean up old entries every 5 minutes so memory doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests) {
      if (now - data.startTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || (now - record.startTime > windowMs)) {
      // fresh window
      requests.set(ip, { count: 1, startTime: now });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests. Slow down.',
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
}

module.exports = { rateLimiter };
