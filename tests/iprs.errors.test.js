const { mapIPRSError } = require('../src/modules/iprs/utils/iprs.errors');

test('maps IPRS no-record errors to internal error', () => {
  const error = mapIPRSError('ISB-105');
  expect(error.code).toBe('IPRS_RECORD_NOT_FOUND');
  expect(error.statusCode).toBe(404);
  expect(error.retryable).toBe(false);
});
