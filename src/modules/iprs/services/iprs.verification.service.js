const { v4: uuidv4 } = require('uuid');
const iprsConfig = require('../../../config/iprs.config');
const { IPRSError, mapIPRSError } = require('../utils/iprs.errors');
const { validateFingerprintBmp } = require('../utils/iprs.image.utils');
const { mapVerificationResponse } = require('../utils/iprs.response.mapper');
const { lookupOutboundIp } = require('../clients/iprs.soap.client');

class IPRSVerificationService {
  constructor({ client, auditService }) {
    this.client = client;
    this.auditService = auditService;
  }

  async verifyByIdCard({ idNumber, serialNumber, fingerprint, fingerprints }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'ID_CARD',
      identifier: idNumber,
      method: 'VerificationByIDCard',
      resultKey: 'VerificationByIDCardResult',
      fingerprints: fingerprints || (fingerprint ? [fingerprint] : []),
      call: () => this.client.verificationByIdCard({ idNumber, serialNumber, fingerprint, fingerprints }, context),
      context
    });
  }

  async verifyByPassport({ passportNumber, fingerprint, fingerprints }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'PASSPORT',
      identifier: passportNumber,
      method: 'VerificationByPassport',
      resultKey: 'VerificationByPassportResult',
      fingerprints: fingerprints || (fingerprint ? [fingerprint] : []),
      call: () => this.client.verificationByPassport({ passportNumber, fingerprint, fingerprints }, context),
      context
    });
  }

  async verifyByAlienCard({ alienCardNumber, fingerprint, fingerprints }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'ALIEN_CARD',
      identifier: alienCardNumber,
      method: 'VerificationByAlienCard',
      resultKey: 'VerificationByAlienCardResult',
      fingerprints: fingerprints || (fingerprint ? [fingerprint] : []),
      call: () => this.client.verificationByAlienCard({ alienCardNumber, fingerprint, fingerprints }, context),
      context
    });
  }

  async verify({ requestId, type, identifier, method, resultKey, fingerprints, call, context }) {
    if (!fingerprints.length || fingerprints.some((fingerprint) => !validateFingerprintBmp(fingerprint))) {
      throw new IPRSError({
        code: 'IPRS_INVALID_FINGERPRINT',
        message: 'At least one fingerprint must be a Base64-encoded BMP image.',
        statusCode: 400
      });
    }

    const raw = await call();
    const mapped = mapVerificationResponse(raw, resultKey, requestId);
    const fetchedByIp = await this.lookupFetchedByIp();

    if (mapped.errorOccurred) {
      const error = mapIPRSError(mapped.iprsErrorCode, mapped.iprsErrorMessage);
      await this.auditService.record({
        requestId,
        verificationType: type,
        identifier,
        status: error.code === 'IPRS_RECORD_NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
        iprsErrorCode: mapped.iprsErrorCode,
        iprsResponseStatus: mapped.iprsErrorMessage,
        verificationMethod: method,
        requestedBy: context.userId,
        requestedByIp: context.clientIp,
        fetchedByIp,
        source: 'IPRS'
      });
      throw error;
    }

    const audit = await this.auditService.record({
      requestId,
      verificationType: type,
      identifier,
      status: mapped.verified ? 'VERIFIED' : 'NOT_VERIFIED',
      iprsResponseStatus: mapped.verified ? 'MATCH' : 'NO_MATCH',
      verificationMethod: method,
      requestedBy: context.userId,
      requestedByIp: context.clientIp,
      fetchedByIp,
      source: 'IPRS'
    });

    return {
      ...mapped,
      capture: {
        source: 'IPRS',
        requestedByIp: context.clientIp || null,
        fetchedByIp
      },
      verificationId: audit ? audit.id : requestId
    };
  }

  async lookupFetchedByIp() {
    if (process.env.NODE_ENV === 'test' || iprsConfig.provider !== 'real') return null;
    return lookupOutboundIp(iprsConfig);
  }
}

module.exports = IPRSVerificationService;
