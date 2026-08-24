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

let outboundIpPromise = null;
let outboundIpCache = null;

function describeWsdlTarget(wsdlUrl) {
  const url = new URL(wsdlUrl);
  return {
    protocol: url.protocol.replace(':', ''),
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    path: `${url.pathname}${url.search}`
  };
}

function lookupOutboundIp(config) {
  if (process.env.RENDER_OUTBOUND_IP) return Promise.resolve(process.env.RENDER_OUTBOUND_IP);
  if (outboundIpCache) return Promise.resolve(outboundIpCache);
  if (outboundIpPromise) return outboundIpPromise;
  if (!config.outboundIpLookupUrl) return Promise.resolve(null);

  outboundIpPromise = new Promise((resolve) => {
    const request = https.get(config.outboundIpLookupUrl, { timeout: config.outboundIpLookupTimeout }, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          outboundIpCache = parsed.ip || body.trim() || null;
        } catch (_) {
          outboundIpCache = body.trim() || null;
        }

        resolve(outboundIpCache);
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Outbound IP lookup timed out.'));
    });
    request.on('error', () => {
      resolve(null);
    });
  }).finally(() => {
    outboundIpPromise = null;
  });

  return outboundIpPromise;
}

function createTransportAgent(wsdlUrl, verifySsl) {
  // IPRS's documented endpoints are HTTP on private VPN addresses. Passing an
  // https.Agent to an HTTP WSDL is invalid in Node and can prevent SOAP from
  // establishing the correct connection. Keep TLS validation for HTTPS only.
  return /^https:/i.test(wsdlUrl)
    ? new https.Agent({ rejectUnauthorized: verifySsl })
    : new http.Agent();
}

function describeTransportError(error) {
  return {
    name: error.name,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    address: error.address,
    port: error.port,
    message: error.message
  };
}

async function describeNetworkContext(config, context) {
  return {
    incomingClientIp: context.clientIp,
    renderOutboundIp: await lookupOutboundIp(config)
  };
}

class IPRSSoapClient {
  constructor(config = iprsConfig) {
    this.config = config;
    this.client = null;
  }

  async getClient(context = {}) {
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

    const target = describeWsdlTarget(this.config.wsdlUrl);
    const network = await describeNetworkContext(this.config, context);
    logger.info({
      target,
      ...network,
      verifySsl: this.config.verifySsl
    }, 'IPRS_WSDL_FIREWALL_CONNECTING');
    console.log(`[IPRS] Render outbound ${network.renderOutboundIp || 'unknown'} connecting to firewall ${target.protocol}://${target.host}:${target.port}${target.path}; incoming client ${network.incomingClientIp || 'unknown'}`);

    try {
      this.client = await soap.createClientAsync(this.config.wsdlUrl, wsdlOptions);
    } catch (error) {
      logger.error({
        target,
        ...network,
        verifySsl: this.config.verifySsl,
        error: describeTransportError(error)
      }, 'IPRS_WSDL_FIREWALL_CONNECTION_FAILED');
      console.error(`[IPRS] Render outbound ${network.renderOutboundIp || 'unknown'} firewall WSDL connection failed ${target.host}:${target.port} code=${error.code || error.name || 'UNKNOWN'} message=${error.message}; incoming client ${network.incomingClientIp || 'unknown'}`);
      throw error;
    }

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
    const network = await describeNetworkContext(this.config, context);
    let attempt = 0;
    let lastError;

    while (attempt <= this.config.maxRetries) {
      try {
        const client = await this.getClient(context);
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
          ...network,
          operation,
          attempt,
          target: describeWsdlTarget(this.config.wsdlUrl)
        }, 'IPRS_REQUEST_STARTED');
        const target = describeWsdlTarget(this.config.wsdlUrl);
        console.log(`[IPRS] Render outbound ${network.renderOutboundIp || 'unknown'} sending ${operation} to firewall ${target.host}:${target.port} attempt=${attempt}; incoming client ${network.incomingClientIp || 'unknown'}`);

        const response = await client[asyncOperation](this.toSoapPayload(operation, payload));

        logger.info({
          requestId: context.requestId,
          ...network,
          operation,
          duration: Date.now() - startedAt
        }, 'IPRS_REQUEST_COMPLETED');

        return response;
      } catch (error) {
        lastError = error;
        logger.error({
          requestId: context.requestId,
          ...network,
          operation,
          attempt,
          target: describeWsdlTarget(this.config.wsdlUrl),
          error: describeTransportError(error)
        }, 'IPRS_REQUEST_FAILED');
        console.error(`[IPRS] Render outbound ${network.renderOutboundIp || 'unknown'} ${operation} failed attempt=${attempt} code=${error.code || error.name || 'UNKNOWN'} message=${error.message}; incoming client ${network.incomingClientIp || 'unknown'}`);

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

module.exports = {
  IPRSSoapClient,
  OPERATIONS,
  createTransportAgent,
  describeTransportError,
  describeWsdlTarget,
  lookupOutboundIp
};
