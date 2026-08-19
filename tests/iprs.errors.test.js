const { mapIPRSError } = require('../src/modules/iprs/utils/iprs.errors');

test('maps IPRS no-record errors to internal error', () => {
  const error = mapIPRSError('ISB-105');
  expect(error.code).toBe('IPRS_RECORD_NOT_FOUND');
  expect(error.statusCode).toBe(404);
  expect(error.retryable).toBe(false);
});

test('maps an IPRS ISB-114 response to an operation authorization error', () => {
  const error = mapIPRSError('ISB-114');

  expect(error).toMatchObject({
    code: 'IPRS_OPERATION_NOT_AUTHORIZED',
    iprsCode: 'ISB-114',
    statusCode: 403
  });
  expect(error.message).toMatch(/not authorized/i);
});
