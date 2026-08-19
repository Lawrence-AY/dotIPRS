const soap = require('soap');
const http = require('http');
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

function createTransportAgent(wsdlUrl, verifySsl) {
  // IPRS's documented endpoints are HTTP on private VPN addresses. Passing an
  // https.Agent to an HTTP WSDL is invalid in Node and can prevent SOAP from
  // establishing the correct connection. Keep TLS validation for HTTPS only.
  return /^https:/i.test(wsdlUrl)
    ? new https.Agent({ rejectUnauthorized: verifySsl })
    : new http.Agent();
}

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
        agent: createTransportAgent(this.config.wsdlUrl, this.config.verifySsl)
      }
    };

    this.client = await soap.createClientAsync(this.config.wsdlUrl, wsdlOptions);
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

        const response = await client[asyncOperation](this.toSoapPayload(operation, payload));

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

  toSoapPayload(operation, payload) {
    const soapPayload = {
      // The basicHttpBinding WSDL names the IPRS login field `log`.
      // `username` is the local configuration name only; sending it on
      // the SOAP wire leaves IPRS without the required credentials.
      log: this.config.username,
      pass: this.config.password
    };

    if (payload.idNumber) soapPayload.id_number = payload.idNumber;
    if (payload.serialNumber) soapPayload.serial_number = payload.serialNumber;
    if (payload.passportNumber) soapPayload.passport_number = payload.passportNumber;
    if (payload.alienCardNumber) soapPayload.id_number = payload.alienCardNumber;
    if (operation === OPERATIONS.getDataByBirthCertificate && payload.certificateNumber) {
      soapPayload.birthCertNumber = payload.certificateNumber;
    }
    if (operation === OPERATIONS.getDataByDeathCertificate && payload.certificateNumber) {
      soapPayload.deathCertNumber = payload.certificateNumber;
    }
    if (payload.pin) soapPayload.pin = payload.pin;
    // `fingerprints` is an ArrayOfbase64Binary in the IPRS WSDL. node-soap
    // must receive the wrapper object to emit
    // <fingerprints><base64Binary>...</base64Binary></fingerprints>, rather
    // than serializing a single image directly inside <fingerprints>.
    const fingerprints = payload.fingerprints || (payload.fingerprint ? [payload.fingerprint] : null);
    if (fingerprints && fingerprints.length) {
      soapPayload.fingerprints = { base64Binary: fingerprints };
    }

    return soapPayload;
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

module.exports = { IPRSSoapClient, OPERATIONS, createTransportAgent };
