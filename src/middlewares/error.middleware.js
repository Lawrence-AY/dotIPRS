const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  logger.error({
    requestId: req.requestId,
    code,
    statusCode,
    message: err.message
  }, 'REQUEST_FAILED');

  const safeOperationalError = err.name === 'IPRSError' || code.startsWith('IPRS_');

  return res.status(statusCode).json({
    success: false,
    requestId: req.requestId,
    error: {
      code,
      message: statusCode >= 500 && !safeOperationalError ? 'An unexpected error occurred.' : err.message,
      retryable: Boolean(err.retryable)
    }
  });
}

module.exports = { errorHandler };
