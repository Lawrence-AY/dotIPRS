const buckets = new Map();

function clientRateLimit(req, res, next) {
  const clientId = (req.client && req.client.clientId) || 'anonymous';
  const max = (req.client && req.client.rateLimit) || 100;
  const now = Date.now();
  const windowMs = 60000;
  const current = buckets.get(clientId) || { count: 0, resetAt: now + windowMs };

  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  current.count += 1;
  buckets.set(clientId, current);

  res.setHeader('x-rate-limit-limit', max);
  res.setHeader('x-rate-limit-remaining', Math.max(max - current.count, 0));
  res.setHeader('x-rate-limit-reset', Math.ceil((current.resetAt - now) / 1000));

  if (current.count > max) {
    return res.status(429).json({
      success: false,
      requestId: req.requestId,
      error: {
        code: 'RATE_LIMITED',
        message: 'Client rate limit exceeded.',
        retryable: true
      }
    });
  }

  return next();
}

module.exports = { clientRateLimit };
