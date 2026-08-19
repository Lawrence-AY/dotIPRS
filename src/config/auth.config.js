require('dotenv').config();

module.exports = {
  // Gateway sessions and the upstream IPRS SOAP account are intentionally
  // separate. A gateway token must never double as an IPRS credential.
  sessionUsername: process.env.AUTH_SESSION_USERNAME || process.env.GATEWAY_BOOTSTRAP_CLIENT_ID,
  sessionPassword: process.env.AUTH_SESSION_PASSWORD || process.env.GATEWAY_BOOTSTRAP_CLIENT_SECRET,
  sessionSecret: process.env.AUTH_SESSION_SECRET || process.env.IPRS_IDENTIFIER_HASH_SECRET || 'development-session-secret',
  sessionTtlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS || 3600),
  // IPRS callers can use a stateless API key instead of first creating a
  // gateway session. This key protects this REST API only; never reuse the
  // upstream IPRS SOAP username or password as an API key.
  iprsAuthMode: (process.env.IPRS_AUTH_MODE || 'session').toLowerCase(),
  iprsApiKey: process.env.IPRS_API_KEY,
  defaultClientId: process.env.GATEWAY_BOOTSTRAP_CLIENT_ID || process.env.AUTH_SESSION_USERNAME || 'gateway_dev_client',
  defaultClientName: process.env.GATEWAY_BOOTSTRAP_CLIENT_NAME || 'Development Client',
  defaultAllowedOperations: (process.env.GATEWAY_BOOTSTRAP_ALLOWED_OPERATIONS || 'IDENTITY_ID,IDENTITY_PIN,IDENTITY_PASSPORT,IDENTITY_BIRTH_CERTIFICATE,IDENTITY_DEATH_CERTIFICATE,IDENTITY_ALIEN_CARD,VERIFY_ID,VERIFY_PASSPORT,VERIFY_ALIEN_CARD,VERIFY_FINGERPRINT,MEDIA_READ,AUDIT_READ')
    .split(',')
    .map((operation) => operation.trim())
    .filter(Boolean),
  defaultRateLimit: Number(process.env.GATEWAY_BOOTSTRAP_RATE_LIMIT || 100)
};
