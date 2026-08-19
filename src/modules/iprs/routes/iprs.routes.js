const express = require('express');
const rateLimit = require('express-rate-limit');
const iprsConfig = require('../../../config/iprs.config');
const { requireIPRSAuth, authorizeOperations } = require('../../../middlewares/auth.middleware');
const controller = require('../controllers/iprs.controller');
const verificationController = require('../controllers/iprsVerification.controller');
const { schemas, validate } = require('../validators/iprs.validator');

const router = express.Router();

const limiter = rateLimit({
  windowMs: iprsConfig.rateLimitWindowMs,
  max: iprsConfig.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'IPRS_RATE_LIMITED',
    message: 'Too many identity verification requests. Please try again later.'
  }
});

const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'IPRS_TEST_RATE_LIMITED',
    message: 'The temporary IPRS test endpoint allows only three requests every 15 minutes.'
  }
});

const canVerifyId = authorizeOperations('VERIFY_ID', 'IDENTITY_ID', 'IDENTITY_PIN');
const canLookupPin = authorizeOperations('IDENTITY_PIN');
const canVerifyPassport = authorizeOperations('VERIFY_PASSPORT', 'IDENTITY_PASSPORT');
const canVerifyAlienCard = authorizeOperations('VERIFY_ALIEN_CARD', 'IDENTITY_ALIEN_CARD');
const canLookupCertificate = authorizeOperations('IDENTITY_BIRTH_CERTIFICATE', 'IDENTITY_DEATH_CERTIFICATE');
const canAudit = authorizeOperations('AUDIT_READ');

router.get('/health', controller.health);

// This is deliberately opt-in. It uses the server-side IPRS account for a
// short-lived connection test and must not become a general public lookup API.
if (iprsConfig.publicTestEndpointEnabled) {
  router.post('/test/id', testLimiter, validate(schemas.verifyId), controller.testLookupId);
}

router.use(requireIPRSAuth);
router.use(limiter);

router.post('/verify/id', canVerifyId, validate(schemas.verifyId), controller.verifyId);
router.post('/verify/pin', canLookupPin, validate(schemas.pin), controller.verifyPin);
router.post('/verify/passport', canVerifyPassport, validate(schemas.verifyPassport), controller.verifyPassport);
router.post('/verify/alien-card', canVerifyAlienCard, validate(schemas.verifyAlienCard), controller.verifyAlienCard);
router.post('/verify/birth-certificate', canLookupCertificate, validate(schemas.birthCertificate), controller.lookupBirthCertificate);
router.post('/verify/death-certificate', canLookupCertificate, validate(schemas.deathCertificate), controller.lookupDeathCertificate);
router.get('/verifications', canAudit, verificationController.listVerifications);
router.get('/verifications/:id', canAudit, verificationController.getVerification);

module.exports = router;
