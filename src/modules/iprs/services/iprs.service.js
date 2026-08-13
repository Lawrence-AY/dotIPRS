const iprsConfig = require('../../../config/iprs.config');
const { IPRSSoapClient } = require('../clients/iprs.soap.client');
const MockIPRSClient = require('../clients/iprs.mock.client');
const IPRSAuditService = require('./iprs.audit.service');
const IPRSIdentityService = require('./iprs.identity.service');
const IPRSVerificationService = require('./iprs.verification.service');

function createIPRSService() {
  const client = iprsConfig.provider === 'real'
    ? new IPRSSoapClient(iprsConfig)
    : new MockIPRSClient();

  const auditService = new IPRSAuditService();
  const identityService = new IPRSIdentityService({ client, auditService });
  const verificationService = new IPRSVerificationService({ client, auditService });

  return {
    identityService,
    verificationService,
    auditService,
    health() {
      return {
        service: 'IPRS',
        configured: Boolean(iprsConfig.wsdlUrl && iprsConfig.username && iprsConfig.password),
        enabled: iprsConfig.enabled,
        environment: iprsConfig.environment.toUpperCase(),
        provider: iprsConfig.provider,
        soapClient: iprsConfig.provider === 'real' ? 'configured' : 'mock',
        lastSuccessfulRequest: null,
        lastFailure: null
      };
    }
  };
}

module.exports = createIPRSService();
module.exports.createIPRSService = createIPRSService;
