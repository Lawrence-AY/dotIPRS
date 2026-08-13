const crypto = require('crypto');
const iprsConfig = require('../../../config/iprs.config');

class IPRSAuditService {
  getModel() {
    return require('../../../models').IPRSVerification;
  }

  hashIdentifier(identifier) {
    return crypto
      .createHmac('sha256', iprsConfig.identifierHashSecret)
      .update(String(identifier))
      .digest('hex');
  }

  async record({ requestId, memberId, verificationType, identifier, status, iprsErrorCode, iprsResponseStatus, verificationMethod, requestedBy }) {
    if (!iprsConfig.auditEnabled) {
      return { id: requestId };
    }

    const IPRSVerification = this.getModel();
    if (!IPRSVerification || !IPRSVerification.create) return null;

    return IPRSVerification.create({
      requestId,
      memberId: memberId || null,
      verificationType,
      identifierHash: this.hashIdentifier(identifier),
      status,
      iprsErrorCode: iprsErrorCode || null,
      iprsResponseStatus: iprsResponseStatus || null,
      verificationMethod: verificationMethod || null,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      requestedBy: requestedBy || null
    });
  }

  async findById(id) {
    if (!iprsConfig.auditEnabled) return null;

    const IPRSVerification = this.getModel();
    if (!IPRSVerification || !IPRSVerification.findByPk) return null;
    return IPRSVerification.findByPk(id);
  }

  async list({ page = 1, limit = 20, status, verificationType, requestedBy }) {
    if (!iprsConfig.auditEnabled) return { count: 0, rows: [] };

    const IPRSVerification = this.getModel();
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const where = {};

    if (status) where.status = status;
    if (verificationType) where.verificationType = verificationType;
    if (requestedBy) where.requestedBy = requestedBy;

    return IPRSVerification.findAndCountAll({
      where,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = IPRSAuditService;
