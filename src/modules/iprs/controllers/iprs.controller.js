const iprsService = require('../services/iprs.service');
const iprsConfig = require('../../../config/iprs.config');
const sessionService = require('../../auth/services/session.service');
const {
  IPRSSoapClient,
  describeTransportError,
  describeWsdlTarget,
  lookupOutboundIp
} = require('../clients/iprs.soap.client');

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

function step(name, ok, details = {}) {
  return { name, ok, ...details };
}

async function diagnostics(req, res) {
  const context = contextFromReq(req);
  const target = iprsConfig.wsdlUrl ? describeWsdlTarget(iprsConfig.wsdlUrl) : null;
  const steps = [];
  let token = null;
  let tokenType = null;
  let expiresIn = null;
  let renderOutboundIp = null;
  let exposedOperations = [];

  const configured = Boolean(iprsConfig.wsdlUrl && iprsConfig.username && iprsConfig.password);
  steps.push(step('configuration', configured, {
    provider: iprsConfig.provider,
    target,
    usernameConfigured: Boolean(iprsConfig.username),
    passwordConfigured: Boolean(iprsConfig.password)
  }));

  try {
    const session = await sessionService.createSession({
      username: iprsConfig.username,
      password: iprsConfig.password
    });
    token = session.token;
    tokenType = session.tokenType;
    expiresIn = session.expiresIn;
    steps.push(step('gatewaySessionToken', true, {
      clientId: session.client.clientId,
      expiresIn: session.expiresIn
    }));
  } catch (error) {
    steps.push(step('gatewaySessionToken', false, {
      code: error.code || error.name,
      message: error.message
    }));
  }

  try {
    renderOutboundIp = await lookupOutboundIp(iprsConfig);
    steps.push(step('renderOutboundIp', Boolean(renderOutboundIp), {
      renderOutboundIp,
      incomingClientIp: context.clientIp
    }));
  } catch (error) {
    steps.push(step('renderOutboundIp', false, {
      incomingClientIp: context.clientIp,
      error: describeTransportError(error)
    }));
  }

  if (iprsConfig.provider !== 'real') {
    steps.push(step('wsdlConnection', true, {
      skipped: true,
      reason: `IPRS_PROVIDER=${iprsConfig.provider}; SOAP WSDL is checked only when IPRS_PROVIDER=real.`
    }));
  } else if (!iprsConfig.wsdlUrl) {
    steps.push(step('wsdlConnection', false, {
      code: 'IPRS_WSDL_URL_MISSING',
      message: 'IPRS_WSDL_URL is not configured.'
    }));
  } else {
    try {
      const diagnosticClient = new IPRSSoapClient(iprsConfig);
      const soapClient = await diagnosticClient.getClient(context);
      exposedOperations = Object.keys(soapClient).filter((key) => key.endsWith('Async')).sort();
      steps.push(step('wsdlConnection', true, {
        target,
        exposedOperations
      }));
    } catch (error) {
      steps.push(step('wsdlConnection', false, {
        target,
        error: describeTransportError(error)
      }));
    }
  }

  const ok = steps.every((item) => item.ok);
  return res.status(200).json({
    success: ok,
    requestId: req.requestId,
    data: {
      target,
      incomingClientIp: context.clientIp,
      renderOutboundIp,
      generatedToken: token ? { tokenType, token, expiresIn } : null,
      steps
    }
  });
}

module.exports = {
  verifyId,
  verifyPin,
  testLookupId,
  verifyPassport,
  verifyAlienCard,
  lookupBirthCertificate,
  lookupDeathCertificate,
  diagnostics,
  health
};
