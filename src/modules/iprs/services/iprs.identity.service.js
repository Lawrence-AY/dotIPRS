const { v4: uuidv4 } = require('uuid');
const { mapIPRSError } = require('../utils/iprs.errors');
const { mapIdentityResponse } = require('../utils/iprs.response.mapper');

class IPRSIdentityService {
  constructor({ client, auditService }) {
    this.client = client;
    this.auditService = auditService;
  }

  async getByIdNumber(idNumber, serialNumber, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'ID_CARD',
      identifier: idNumber,
      method: 'GetDataByIdCard',
      resultKey: 'GetDataByIdCardResult',
      call: () => this.client.getDataByIdCard({ idNumber, serialNumber }, context),
      context
    });
  }

  async getByPin(pin, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'PIN',
      identifier: pin,
      method: 'GetDataByPin',
      resultKey: 'GetDataByPinResult',
      call: () => this.client.getDataByPin({ pin }, context),
      context
    });
  }

  async getByPassport(passportNumber, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'PASSPORT',
      identifier: passportNumber,
      method: 'GetDataByPassport',
      resultKey: 'GetDataByPassportResult',
      call: () => this.client.getDataByPassport({ passportNumber }, context),
      context
    });
  }

  async getByBirthCertificate(certificateNumber, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'BIRTH_CERTIFICATE',
      identifier: certificateNumber,
      method: 'GetDataByBirthCertificate',
      resultKey: 'GetDataByBirthCertificateResult',
      call: () => this.client.getDataByBirthCertificate({ certificateNumber }, context),
      context
    });
  }

  async getByDeathCertificate(certificateNumber, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'DEATH_CERTIFICATE',
      identifier: certificateNumber,
      method: 'GetDataByDeathCertificate',
      resultKey: 'GetDataByDeathCertificateResult',
      call: () => this.client.getDataByDeathCertificate({ certificateNumber }, context),
      context
    });
  }

  async getByAlienCard(alienCardNumber, context = {}) {
    return this.lookup({
      requestId: context.requestId || uuidv4(),
      type: 'ALIEN_CARD',
      identifier: alienCardNumber,
      method: 'GetDataByAlienCard',
      resultKey: 'GetDataByAlienCardResult',
      call: () => this.client.getDataByAlienCard({ alienCardNumber }, context),
      context
    });
  }

  async lookup({ requestId, type, identifier, method, resultKey, call, context }) {
    const raw = await call();
    const mapped = mapIdentityResponse(raw, resultKey, requestId);

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
      status: mapped.verified ? 'VERIFIED' : 'NOT_FOUND',
      iprsResponseStatus: mapped.verified ? 'OK' : 'EMPTY_RESULT',
      verificationMethod: method,
      requestedBy: context.userId
    });

    return {
      ...mapped,
      verificationId: audit ? audit.id : requestId
    };
  }
}

module.exports = IPRSIdentityService;
