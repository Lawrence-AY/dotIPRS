const { v4: uuidv4 } = require('uuid');
const { IPRSError, mapIPRSError } = require('../utils/iprs.errors');
const { validateFingerprintBmp } = require('../utils/iprs.image.utils');
const { mapVerificationResponse } = require('../utils/iprs.response.mapper');

class IPRSVerificationService {
  constructor({ client, auditService }) {
    this.client = client;
    this.auditService = auditService;
  }

  async verifyByIdCard({ idNumber, serialNumber, fingerprint }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'ID_CARD',
      identifier: idNumber,
      method: 'VerificationByIDCard',
      resultKey: 'VerificationByIDCardResult',
      fingerprint,
      call: () => this.client.verificationByIdCard({ idNumber, serialNumber, fingerprint }, context),
      context
    });
  }

  async verifyByPassport({ passportNumber, fingerprint }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'PASSPORT',
      identifier: passportNumber,
      method: 'VerificationByPassport',
      resultKey: 'VerificationByPassportResult',
      fingerprint,
      call: () => this.client.verificationByPassport({ passportNumber, fingerprint }, context),
      context
    });
  }

  async verifyByAlienCard({ alienCardNumber, fingerprint }, context = {}) {
    return this.verify({
      requestId: context.requestId || uuidv4(),
      type: 'ALIEN_CARD',
      identifier: alienCardNumber,
      method: 'VerificationByAlienCard',
      resultKey: 'VerificationByAlienCardResult',
      fingerprint,
      call: () => this.client.verificationByAlienCard({ alienCardNumber, fingerprint }, context),
      context
    });
  }

  async verify({ requestId, type, identifier, method, resultKey, fingerprint, call, context }) {
    if (fingerprint && !validateFingerprintBmp(fingerprint)) {
      throw new IPRSError({
        code: 'IPRS_INVALID_FINGERPRINT',
        message: 'Fingerprint must be a Base64-encoded BMP image.',
        statusCode: 400
      });
    }

    const raw = await call();
    const mapped = mapVerificationResponse(raw, resultKey, requestId);

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
        requestedBy: context.userId
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
      requestedBy: context.userId
    });

    return {
      ...mapped,
      verificationId: audit ? audit.id : requestId
    };
  }
}

module.exports = IPRSVerificationService;
