const { verifySessionToken } = require('../modules/auth/services/session.service');

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  const sessionUser = verifySessionToken(bearerToken);

  if (sessionUser) {
    req.client = sessionUser;
    return next();
  }

  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (!userId || !role) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Client authentication is required. Create a session with POST /api/v1/auth/session, then send Authorization: Bearer <token>.'
    });
  }

  req.client = {
    id: userId,
    clientId: userId,
    name: 'Header Client',
    allowedOperations: role === 'GATEWAY_ADMIN' ? ['*'] : String(role).split(',').map((item) => item.trim()),
    rateLimit: 100
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

module.exports = { requireAuth, authorizeOperations };
