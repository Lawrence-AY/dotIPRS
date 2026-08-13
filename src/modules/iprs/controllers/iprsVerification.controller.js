const iprsService = require('../services/iprs.service');

function serializeVerification(record) {
  if (!record) return null;
  const value = typeof record.toJSON === 'function' ? record.toJSON() : record;

  return {
    id: value.id,
    requestId: value.requestId,
    memberId: value.memberId,
    verificationType: value.verificationType,
    status: value.status,
    iprsErrorCode: value.iprsErrorCode,
    iprsResponseStatus: value.iprsResponseStatus,
    verificationMethod: value.verificationMethod,
    verifiedAt: value.verifiedAt,
    requestedBy: value.requestedBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

async function listVerifications(req, res, next) {
  try {
    const result = await iprsService.auditService.list(req.query);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    return res.json({
      success: true,
      data: result.rows.map(serializeVerification),
      meta: {
        total: result.count,
        page,
        limit,
        pages: Math.ceil(result.count / limit)
      },
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
}

async function getVerification(req, res, next) {
  try {
    const verification = await iprsService.auditService.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        code: 'VERIFICATION_NOT_FOUND',
        message: 'Verification record was not found.'
      });
    }

    return res.json({
      success: true,
      data: serializeVerification(verification),
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listVerifications,
  getVerification
};
