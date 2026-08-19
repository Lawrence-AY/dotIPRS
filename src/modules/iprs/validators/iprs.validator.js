const Joi = require('joi');

const idNumber = Joi.string().trim().pattern(/^\d{6,10}$/).required();
const optionalIdNumber = Joi.string().trim().pattern(/^\d{6,10}$/).optional();
const serialNumber = Joi.string().trim().pattern(/^[A-Za-z0-9-]{3,20}$/).optional();
const passportNumber = Joi.string().trim().pattern(/^[A-Za-z0-9-]{5,20}$/).required();
const alienCardNumber = Joi.string().trim().pattern(/^[A-Za-z0-9-]{5,20}$/).required();
const certificateNumber = Joi.string().trim().pattern(/^[A-Za-z0-9-]{4,30}$/).required();
const pin = Joi.string().trim().pattern(/^[A-Za-z]\d{9}[A-Za-z]$/).required();
const fingerprint = Joi.string().trim().max(1000000).optional();
const fingerprints = Joi.array().items(Joi.string().trim().max(1000000)).min(1).max(10).optional();

const schemas = {
  // `/verify/id` accepts either a National ID lookup or a PIN lookup for
  // backwards compatibility. Fingerprint verification is only valid for an
  // ID-card lookup, never a PIN lookup.
  verifyId: Joi.object({ idNumber: optionalIdNumber, serialNumber, pin: pin.optional(), fingerprint, fingerprints })
    .xor('idNumber', 'pin')
    .with('serialNumber', 'idNumber')
    .with('fingerprint', 'idNumber')
    .with('fingerprints', 'idNumber'),
  verifyPassport: Joi.object({ passportNumber, fingerprint, fingerprints }),
  verifyAlienCard: Joi.object({ alienCardNumber, fingerprint, fingerprints }),
  birthCertificate: Joi.object({ certificateNumber }),
  deathCertificate: Joi.object({ certificateNumber }),
  pin: Joi.object({ pin })
};

function validate(schema) {
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        message: 'Invalid request payload.',
        details: error.details.map((detail) => detail.message)
      });
    }

    req.body = value;
    return next();
  };
}

module.exports = {
  schemas,
  validate
};
