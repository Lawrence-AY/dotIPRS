const crypto = require('crypto');
const authConfig = require('../../../config/auth.config');
const clientService = require('../../clients/services/client.service');

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(payload) {
  return crypto
    .createHmac('sha256', authConfig.sessionSecret)
    .update(payload)
    .digest('base64url');
}

async function createSession({ username, password, clientId, clientSecret }) {
  const client = await clientService.authenticate(clientId || username, clientSecret || password);
  if (!client) {
    const error = new Error('Invalid username or password.');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: client.clientId,
    clientId: client.clientId,
    clientName: client.name,
    allowedOperations: client.allowedOperations || [],
    rateLimit: client.rateLimit || authConfig.defaultRateLimit,
    iat: now,
    exp: now + authConfig.sessionTtlSeconds
  };
  const encodedPayload = base64UrlEncode(payload);
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    tokenType: 'Bearer',
    expiresIn: authConfig.sessionTtlSeconds,
    client: {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      allowedOperations: payload.allowedOperations,
      rateLimit: payload.rateLimit
    }
  };
}

function verifySessionToken(token) {
  try {
    if (!token || !token.includes('.')) return null;

    const [encodedPayload, signature] = token.split('.');
    const expectedSignature = sign(encodedPayload);

    if (Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature)) return null;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = base64UrlDecode(encodedPayload);
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: payload.sub,
      clientId: payload.clientId,
      name: payload.clientName,
      allowedOperations: payload.allowedOperations || [],
      rateLimit: payload.rateLimit || authConfig.defaultRateLimit
    };
  } catch (_) {
    return null;
  }
}

module.exports = {
  createSession,
  verifySessionToken
};
