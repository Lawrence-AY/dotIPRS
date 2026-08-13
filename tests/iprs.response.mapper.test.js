const { mapIdentityResponse } = require('../src/modules/iprs/utils/iprs.response.mapper');

test('maps IPRS identity response into clean JSON', () => {
  const mapped = mapIdentityResponse([{
    ErrorOccurred: false,
    IDNumber: '12345678',
    FirstName: 'Jane',
    Surname: 'Doe',
    Photo: Buffer.from('image').toString('base64')
  }], 'GetDataByIdCardResult', 'req-1');

  expect(mapped.verified).toBe(true);
  expect(mapped.person.firstName).toBe('Jane');
  expect(mapped.person.surname).toBe('Doe');
  expect(mapped.verificationReference).toBe('req-1');
});
