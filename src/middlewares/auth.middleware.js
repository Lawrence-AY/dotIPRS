const { verifySessionToken } = require('../modules/auth/services/session.service');
const authConfig = require('../config/auth.config');

function keysMatch(provided, expected) {
  if (!provided || !expected) return false;
  const providedKey = Buffer.from(provided);
  const expectedKey = Buffer.from(expected);
  return providedKey.length === expectedKey.length
    && require('crypto').timingSafeEqual(providedKey, expectedKey);
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  const sessionUser = verifySessionToken(bearerToken);

  if (sessionUser) {
    req.client = sessionUser;
    return next();
  }

  return res.status(401).json({
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Client authentication is required. Create a session with POST /api/v1/auth/session, then send Authorization: Bearer <token>.'
  });
}

function requireIPRSAuth(req, res, next) {
  if (authConfig.iprsAuthMode !== 'api_key') return requireAuth(req, res, next);

  const authorization = req.headers.authorization || '';
  const apiKey = req.headers['x-api-key']
    || (authorization.startsWith('Bearer ') ? authorization.slice(7) : null);

  if (!authConfig.iprsApiKey) {
    return res.status(503).json({
      success: false,
      code: 'IPRS_AUTH_NOT_CONFIGURED',
      message: 'IPRS_API_KEY must be configured when IPRS_AUTH_MODE=api_key.'
    });
  }

  if (!keysMatch(apiKey, authConfig.iprsApiKey)) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Provide a valid X-API-Key to access IPRS.'
    });
  }

  req.client = {
    id: 'iprs-api-key-client',
    clientId: 'iprs-api-key-client',
    name: 'IPRS API Key Client',
    allowedOperations: ['*'],
    rateLimit: authConfig.defaultRateLimit
  };
  return next();
}

function authorizeOperations(...operations) {
  return (req, res, next) => {
    const allowed = (req.client && req.client.allowedOperations) || [];
    const permitted = allowed.includes('*') || operations.some((operation) => allowed.includes(operation));

    if (!req.client || !permitted) {
      return res.status(403).json({
        success: false,
        code: 'OPERATION_NOT_ALLOWED',
        message: 'This client is not authorized to perform the requested operation.'
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireIPRSAuth, authorizeOperations };
