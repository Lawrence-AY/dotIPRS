const express = require('express');
const rateLimit = require('express-rate-limit');
const iprsConfig = require('../../../config/iprs.config');
const { requireAuth, authorizeRoles } = require('../../../middlewares/auth.middleware');
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

const canVerify = authorizeRoles('SYSTEM_ADMIN', 'SACCO_ADMIN', 'REGISTRATION_OFFICER', 'LOAN_OFFICER');
const canAudit = authorizeRoles('SYSTEM_ADMIN', 'SACCO_ADMIN', 'AUDITOR');

router.get('/health', controller.health);

router.use(requireAuth);
router.use(limiter);

router.post('/verify/id', canVerify, validate(schemas.verifyId), controller.verifyId);
router.post('/verify/passport', canVerify, validate(schemas.verifyPassport), controller.verifyPassport);
router.post('/verify/alien-card', canVerify, validate(schemas.verifyAlienCard), controller.verifyAlienCard);
router.post('/verify/birth-certificate', canVerify, validate(schemas.birthCertificate), controller.lookupBirthCertificate);
router.post('/verify/death-certificate', canVerify, validate(schemas.deathCertificate), controller.lookupDeathCertificate);
router.get('/verifications', canAudit, verificationController.listVerifications);
router.get('/verifications/:id', canAudit, verificationController.getVerification);

module.exports = router;
