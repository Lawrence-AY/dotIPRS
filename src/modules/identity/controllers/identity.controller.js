const iprsService = require('../../iprs/services/iprs.service');

function contextFromReq(req) {
  return {
    requestId: req.requestId,
    clientId: req.client && req.client.clientId,
    userId: req.client && req.client.clientId
  };
}

async function getById(req, res, next) {
  try {
    const data = await iprsService.identityService.getByIdNumber(req.body.idNumber, req.body.serialNumber, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

async function getByPin(req, res, next) {
  try {
    const data = await iprsService.identityService.getByPin(req.body.pin, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

async function getByPassport(req, res, next) {
  try {
    const data = await iprsService.identityService.getByPassport(req.body.passportNumber, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

async function getByBirthCertificate(req, res, next) {
  try {
    const data = await iprsService.identityService.getByBirthCertificate(req.body.certificateNumber, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

async function getByDeathCertificate(req, res, next) {
  try {
    const data = await iprsService.identityService.getByDeathCertificate(req.body.certificateNumber, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

async function getByAlienCard(req, res, next) {
  try {
    const data = await iprsService.identityService.getByAlienCard(req.body.alienCardNumber, contextFromReq(req));
    res.json({ success: true, requestId: req.requestId, data });
  } catch (error) {
    next(error);
  }
}

function mediaNotImplemented(req, res) {
  res.status(404).json({
    success: false,
    requestId: req.requestId,
    error: {
      code: 'MEDIA_NOT_AVAILABLE',
      message: 'Media retrieval is not enabled for this gateway deployment.',
      retryable: false
    }
  });
}

module.exports = {
  getById,
  getByPin,
  getByPassport,
  getByBirthCertificate,
  getByDeathCertificate,
  getByAlienCard,
  mediaNotImplemented
};
