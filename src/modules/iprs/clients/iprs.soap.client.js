const soap = require('soap');
const https = require('https');
const iprsConfig = require('../../../config/iprs.config');
const logger = require('../../../utils/logger');
const { IPRSError, isRetryableTransportError } = require('../utils/iprs.errors');

const OPERATIONS = {
  login: 'Login',
  getDataByIdCard: 'GetDataByIdCard',
  getDataByPin: 'GetDataByPin',
  getDataByPassport: 'GetDataByPassport',
  getDataByBirthCertificate: 'GetDataByBirthCertificate',
  getDataByDeathCertificate: 'GetDataByDeathCertificate',
  getDataByAlienCard: 'GetDataByAlienCard',
  verificationByIdCard: 'VerificationByIDCard',
  verificationByPassport: 'VerificationByPassport',
  verificationByAlienCard: 'VerificationByAlienCard'
};

class IPRSSoapClient {
  constructor(config = iprsConfig) {
    this.config = config;
    this.client = null;
  }

  async getClient() {
    if (this.client) return this.client;
    if (!this.config.wsdlUrl) {
      throw new IPRSError({
        code: 'IPRS_NOT_CONFIGURED',
        message: 'IPRS WSDL URL is not configured.',
        statusCode: 503
      });
    }

    const wsdlOptions = {
      timeout: this.config.timeout,
      wsdl_options: {
        timeout: this.config.timeout,
        agent: new https.Agent({ rejectUnauthorized: this.config.verifySsl })
      }
    };

    this.client = await soap.createClientAsync(this.config.wsdlUrl, wsdlOptions);
    this.client.setSecurity(new soap.BasicAuthSecurity(this.config.username, this.config.password));
    return this.client;
  }

  ensureOperationAllowed(operation) {
    if (this.config.allowedOperations.length && !this.config.allowedOperations.includes(operation)) {
      throw new IPRSError({
        code: 'IPRS_OPERATION_NOT_ENABLED',
        message: 'This IPRS operation is not enabled for this deployment.',
        statusCode: 403
      });
    }
  }

  async call(operation, payload, context = {}) {
    this.ensureOperationAllowed(operation);

    const startedAt = Date.now();
    let attempt = 0;
    let lastError;

    while (attempt <= this.config.maxRetries) {
      try {
        const client = await this.getClient();
        const asyncOperation = `${operation}Async`;

        if (typeof client[asyncOperation] !== 'function') {
          throw new IPRSError({
            code: 'IPRS_OPERATION_UNAVAILABLE',
            message: 'The configured IPRS service does not expose the requested operation.',
            statusCode: 502
          });
        }

        logger.info({
          requestId: context.requestId,
          operation,
          attempt
        }, 'IPRS_REQUEST_STARTED');

        const response = await client[asyncOperation](this.withCredentials(payload));

        logger.info({
          requestId: context.requestId,
          operation,
          duration: Date.now() - startedAt
        }, 'IPRS_REQUEST_COMPLETED');

        return response;
      } catch (error) {
        lastError = error;
        if (error instanceof IPRSError || !isRetryableTransportError(error) || attempt >= this.config.maxRetries) break;
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        attempt += 1;
      }
    }

    throw this.normalizeTransportError(lastError);
  }

  withCredentials(payload) {
    return {
      ...payload,
      username: this.config.username,
      password: this.config.password
    };
  }

  normalizeTransportError(error) {
    if (error instanceof IPRSError) return error;

    if (/timeout/i.test(error.message || '') || error.code === 'ETIMEDOUT') {
      return new IPRSError({
        code: 'IPRS_TIMEOUT',
        message: 'Identity verification service is temporarily unavailable.',
        statusCode: 504,
        retryable: true
      });
    }

    return new IPRSError({
      code: 'IPRS_SERVICE_UNAVAILABLE',
      message: 'Identity verification service is unavailable.',
      statusCode: 503,
      retryable: true
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  login(payload, context) { return this.call(OPERATIONS.login, payload, context); }
  getDataByIdCard(payload, context) { return this.call(OPERATIONS.getDataByIdCard, payload, context); }
  getDataByPin(payload, context) { return this.call(OPERATIONS.getDataByPin, payload, context); }
  getDataByPassport(payload, context) { return this.call(OPERATIONS.getDataByPassport, payload, context); }
  getDataByBirthCertificate(payload, context) { return this.call(OPERATIONS.getDataByBirthCertificate, payload, context); }
  getDataByDeathCertificate(payload, context) { return this.call(OPERATIONS.getDataByDeathCertificate, payload, context); }
  getDataByAlienCard(payload, context) { return this.call(OPERATIONS.getDataByAlienCard, payload, context); }
  verificationByIdCard(payload, context) { return this.call(OPERATIONS.verificationByIdCard, payload, context); }
  verificationByPassport(payload, context) { return this.call(OPERATIONS.verificationByPassport, payload, context); }
  verificationByAlienCard(payload, context) { return this.call(OPERATIONS.verificationByAlienCard, payload, context); }
}

module.exports = { IPRSSoapClient, OPERATIONS };
