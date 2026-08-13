class IPRSError extends Error {
  constructor({ code, message, statusCode = 400, retryable = false, iprsCode = null }) {
    super(message);
    this.name = 'IPRSError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.iprsCode = iprsCode;
  }
}

const IPRS_ERROR_MAP = {
  'ISB-101': { code: 'IPRS_INVALID_ID', message: 'Invalid identification number format.', statusCode: 400, retryable: false },
  'ISB-103': { code: 'IPRS_MISSING_PARAMETERS', message: 'Required verification details are missing.', statusCode: 400, retryable: false },
  'ISB-105': { code: 'IPRS_RECORD_NOT_FOUND', message: 'The provided identification details could not be verified.', statusCode: 404, retryable: false },
  'ISB-108': { code: 'IPRS_BALANCE_EXHAUSTED', message: 'Identity verification is temporarily unavailable.', statusCode: 503, retryable: false },
  'ISB-109': { code: 'IPRS_INSUFFICIENT_PERMISSIONS', message: 'This IPRS operation is not authorized.', statusCode: 403, retryable: false },
  'ISB-110': { code: 'IPRS_LOGIN_REQUIRED', message: 'Identity verification service requires authentication.', statusCode: 503, retryable: false },
  'ISB-114': { code: 'IPRS_INVALID_CREDENTIALS', message: 'Identity verification service is not configured correctly.', statusCode: 503, retryable: false },
  'ISB-116': { code: 'IPRS_INVALID_FINGERPRINT', message: 'Invalid fingerprint image format.', statusCode: 400, retryable: false }
};

function mapIPRSError(iprsCode, fallbackMessage) {
  const mapped = IPRS_ERROR_MAP[iprsCode] || {
    code: 'IPRS_ERROR',
    message: fallbackMessage || 'Identity verification failed.',
    statusCode: 502,
    retryable: false
  };

  return new IPRSError({ ...mapped, iprsCode });
}

function isRetryableTransportError(error) {
  const code = error && (error.code || error.errno);
  return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND'].includes(code) ||
    /timeout|temporarily unavailable|service unavailable/i.test(error.message || '');
}

module.exports = {
  IPRSError,
  IPRS_ERROR_MAP,
  mapIPRSError,
  isRetryableTransportError
};
