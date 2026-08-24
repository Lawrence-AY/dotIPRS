const iprsService = require('../services/iprs.service');

function clientIpFromReq(req) {
  return req.headers['true-client-ip']
    || req.headers['cf-connecting-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip
    || req.socket?.remoteAddress;
}

function contextFromReq(req) {
  return {
    requestId: req.requestId,
    userId: req.client && req.client.id,
    clientIp: clientIpFromReq(req)
  };
}

async function verifyId(req, res, next) {
  try {
    const data = req.body.pin
      ? await iprsService.identityService.getByPin(req.body.pin, contextFromReq(req))
      : req.body.fingerprint || req.body.fingerprints?.length
      ? await iprsService.verificationService.verifyByIdCard(req.body, contextFromReq(req))
      : await iprsService.identityService.getByIdNumber(req.body.idNumber, req.body.serialNumber, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function verifyPin(req, res, next) {
  try {
    const data = await iprsService.identityService.getByPin(req.body.pin, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function testLookupId(req, res, next) {
  try {
    const data = await iprsService.identityService.getByIdNumber(
      req.body.idNumber,
      req.body.serialNumber,
      contextFromReq(req)
    );
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function verifyPassport(req, res, next) {
  try {
    const data = req.body.fingerprint || req.body.fingerprints?.length
      ? await iprsService.verificationService.verifyByPassport(req.body, contextFromReq(req))
      : await iprsService.identityService.getByPassport(req.body.passportNumber, contextFromReq(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
}

async function verifyAlienCard(req, res, next) {
  try {
    const data = req.body.fingerprint || req.body.fingerprints?.length
      ? await iprsService.verificationService.verifyByAlienCard(req.body, contextFromReq(req))
      : await iprsService.identityService.getByAlienCard(req.body.alienCardNumber, contextFromReq(req));
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
  verifyPin,
  testLookupId,
  verifyPassport,
  verifyAlienCard,
  lookupBirthCertificate,
  lookupDeathCertificate,
  health
};
