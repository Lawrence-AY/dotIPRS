const pino = require('pino');

const redact = [
  'req.headers.authorization',
  'req.headers.x-api-key',
  'password',
  '*.password',
  'IPRS_PASSWORD',
  'fingerprint',
  '*.fingerprint',
  'photo',
  '*.photo',
  'signature',
  '*.signature',
  'base64',
  '*.base64'
];

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact
});
