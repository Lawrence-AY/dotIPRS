const crypto = require('crypto');
const iprsConfig = require('../../../config/iprs.config');

class IPRSAuditService {
  constructor() {
    this.records = [];
  }

  hashIdentifier(identifier) {
    return crypto
      .createHmac('sha256', iprsConfig.identifierHashSecret)
      .update(String(identifier))
      .digest('hex');
  }

  async record({
    requestId,
    memberId,
    verificationType,
    identifier,
    status,
    iprsErrorCode,
    iprsResponseStatus,
    verificationMethod,
    requestedBy,
    requestedByIp,
    fetchedByIp,
    source
  }) {
    if (!iprsConfig.auditEnabled) {
      return { id: requestId };
    }

    const record = {
      id: requestId,
      requestId,
      memberId: memberId || null,
      verificationType,
      identifierHash: this.hashIdentifier(identifier),
      status,
      iprsErrorCode: iprsErrorCode || null,
      iprsResponseStatus: iprsResponseStatus || null,
      verificationMethod: verificationMethod || null,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      requestedBy: requestedBy || null,
      requestedByIp: requestedByIp || null,
      fetchedByIp: fetchedByIp || null,
      source: source || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.records.unshift(record);
    return record;
  }

  async findById(id) {
    if (!iprsConfig.auditEnabled) return null;

    return this.records.find((record) => record.id === id) || null;
  }

  async list({ page = 1, limit = 20, status, verificationType, requestedBy }) {
    if (!iprsConfig.auditEnabled) return { count: 0, rows: [] };

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const where = {};

    if (status) where.status = status;
    if (verificationType) where.verificationType = verificationType;
    if (requestedBy) where.requestedBy = requestedBy;

    const rows = this.records.filter((record) => Object.entries(where).every(([key, value]) => record[key] === value));
    return { count: rows.length, rows: rows.slice((safePage - 1) * safeLimit, safePage * safeLimit) };
  }
}

module.exports = IPRSAuditService;
