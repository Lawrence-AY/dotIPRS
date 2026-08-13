const iprsService = require('../services/iprs.service');

function contextFromReq(req) {
  return {
    requestId: req.requestId,
    userId: req.user && req.user.id
  };
}

async function verifyId(req, res, next) {
  try {
    const data = await iprsService.verificationService.verifyByIdCard(req.body, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function verifyPassport(req, res, next) {
  try {
    const data = await iprsService.verificationService.verifyByPassport(req.body, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function verifyAlienCard(req, res, next) {
  try {
    const data = await iprsService.verificationService.verifyByAlienCard(req.body, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function lookupBirthCertificate(req, res, next) {
  try {
    const data = await iprsService.identityService.getByBirthCertificate(req.body.certificateNumber, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function lookupDeathCertificate(req, res, next) {
  try {
    const data = await iprsService.identityService.getByDeathCertificate(req.body.certificateNumber, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

function health(req, res) {
  res.json({ success: true, data: iprsService.health(), requestId: req.requestId });
}

module.exports = {
  verifyId,
  verifyPassport,
  verifyAlienCard,
  lookupBirthCertificate,
  lookupDeathCertificate,
  health
};
