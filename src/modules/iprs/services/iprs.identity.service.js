const { v4: uuidv4 } = require('uuid');
const iprsConfig = require('../../../config/iprs.config');
const { mapIPRSError } = require('../utils/iprs.errors');
const { mapIdentityResponse } = require('../utils/iprs.response.mapper');
const { lookupOutboundIp } = require('../clients/iprs.soap.client');

class IPRSIdentityService {
  constructor({ client, auditService, cacheService }) {
    this.client = client;
    this.auditService = auditService;
    this.cacheService = cacheService;
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
    const cached = await this.cacheService.find(type, identifier);
    if (cached && cached.data) {
      await this.auditService.record({
        requestId,
        verificationType: type,
        identifier,
        status: cached.data.verified ? 'VERIFIED' : 'NOT_FOUND',
        iprsResponseStatus: 'CACHE_HIT',
        verificationMethod: method,
        requestedBy: context.userId,
        requestedByIp: context.clientIp,
        fetchedByIp: cached.fetchedByIp,
        source: 'DATABASE'
      });
      await this.cacheService.recordLookupEvent({
        requestId,
        type,
        identifier,
        method,
        source: 'DATABASE',
        status: cached.data.verified ? 'VERIFIED' : 'NOT_FOUND',
        context,
        fetchedByIp: cached.fetchedByIp
      });

      return {
        ...cached.data,
        source: 'DATABASE',
        verificationReference: requestId,
        verificationId: requestId,
        capture: {
          source: 'DATABASE',
          requestedByIp: context.clientIp || null,
          fetchedByIp: cached.fetchedByIp || null,
          cachedAt: cached.updatedAt || cached.createdAt || null
        }
      };
    }

    const raw = await call();
    const mapped = mapIdentityResponse(raw, resultKey, requestId);
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
      await this.cacheService.recordLookupEvent({
        requestId,
        type,
        identifier,
        method,
        source: 'IPRS',
        status: error.code === 'IPRS_RECORD_NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
        context,
        fetchedByIp
      });
      throw error;
    }

    const response = {
      ...mapped,
      capture: {
        source: 'IPRS',
        requestedByIp: context.clientIp || null,
        fetchedByIp,
        cachedAt: new Date()
      }
    };

    const audit = await this.auditService.record({
      requestId,
      verificationType: type,
      identifier,
      status: mapped.verified ? 'VERIFIED' : 'NOT_FOUND',
      iprsResponseStatus: mapped.verified ? 'OK' : 'EMPTY_RESULT',
      verificationMethod: method,
      requestedBy: context.userId,
      requestedByIp: context.clientIp,
      fetchedByIp,
      source: 'IPRS'
    });
    await this.cacheService.recordLookupEvent({
      requestId,
      type,
      identifier,
      method,
      source: 'IPRS',
      status: mapped.verified ? 'VERIFIED' : 'NOT_FOUND',
      context,
      fetchedByIp
    });

    if (mapped.verified) {
      await this.cacheService.save({
        type,
        identifier,
        method,
        data: response,
        context,
        fetchedByIp
      });
    }

    return {
      ...response,
      verificationId: audit ? audit.id : requestId
    };
  }

  async lookupFetchedByIp() {
    if (process.env.NODE_ENV === 'test' || iprsConfig.provider !== 'real') return null;
    return lookupOutboundIp(iprsConfig);
  }
}

module.exports = IPRSIdentityService;
