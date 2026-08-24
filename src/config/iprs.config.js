require('dotenv').config();

const allowedOperations = (process.env.IPRS_ALLOWED_OPERATIONS || '')
  .split(',')
  .map((operation) => operation.trim())
  .filter(Boolean);

module.exports = {
  enabled: process.env.IPRS_ENABLED === 'true',
  provider: process.env.IPRS_PROVIDER || 'mock',
  environment: process.env.IPRS_ENVIRONMENT || 'development',
  wsdlUrl: process.env.IPRS_WSDL_URL,
  username: process.env.IPRS_USERNAME,
  password: process.env.IPRS_PASSWORD,
  timeout: Number(process.env.IPRS_TIMEOUT || 30000),
  soapVersion: process.env.IPRS_SOAP_VERSION || '1.1',
  verifySsl: process.env.IPRS_VERIFY_SSL !== 'false',
  outboundIpLookupUrl: process.env.OUTBOUND_IP_LOOKUP_URL || 'https://api.ipify.org?format=json',
  outboundIpLookupTimeout: Number(process.env.OUTBOUND_IP_LOOKUP_TIMEOUT || 3000),
  maxRetries: Number(process.env.IPRS_MAX_RETRIES || 2),
  retryDelay: Number(process.env.IPRS_RETRY_DELAY || 1000),
  rateLimitWindowMs: Number(process.env.IPRS_RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.IPRS_RATE_LIMIT_MAX || 30),
  publicTestEndpointEnabled: process.env.IPRS_PUBLIC_TEST_ENDPOINT === 'true',
  diagnosticsEndpointEnabled: process.env.IPRS_DIAGNOSTICS_ENDPOINT === 'true',
  allowedOperations,
  identifierHashSecret: process.env.IPRS_IDENTIFIER_HASH_SECRET || process.env.IPRS_PASSWORD || 'development-only-secret',
  auditEnabled: process.env.IPRS_AUDIT_ENABLED === 'true' && process.env.NODE_ENV !== 'test'
};
