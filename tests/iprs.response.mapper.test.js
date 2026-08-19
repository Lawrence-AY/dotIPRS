const { mapIdentityResponse, mapVerificationResponse } = require('../src/modules/iprs/utils/iprs.response.mapper');

test('maps IPRS identity response into clean JSON', () => {
  const mapped = mapIdentityResponse([{
    ErrorOccurred: false,
    ID_Number: '12345678',
    First_Name: 'Jane',
    Other_Name: 'Mary',
    Surname: 'Doe',
    Date_of_Birth: '01/02/1990 12:00:00 AM',
    Date_of_Birth_from_Passport: '1990-02-01',
    Date_of_expiry: '01-Feb-30 12:00:00 AM',
    Photo: Buffer.from('image').toString('base64')
  }], 'GetDataByIdCardResult', 'req-1');

  expect(mapped.verified).toBe(true);
  expect(mapped.person.idNumber).toBe('12345678');
  expect(mapped.person.firstName).toBe('Jane');
  expect(mapped.person.otherNames).toBe('Mary');
  expect(mapped.person.surname).toBe('Doe');
  expect(mapped.person.dateOfBirth).toBe('01/02/1990 12:00:00 AM');
  expect(mapped.person.dateOfBirthFromPassport).toBe('1990-02-01');
  expect(mapped.person.dateOfExpiry).toBe('01-Feb-30 12:00:00 AM');
  expect(mapped.verificationReference).toBe('req-1');
});

test('maps every documented IPRS identity component', () => {
  const mapped = mapIdentityResponse([{
    ErrorOccurred: false,
    Citizenship: 'Kenyan',
    Clan: 'Example clan',
    Date_of_Birth: '01/02/1990 12:00:00 AM',
    Date_of_Death: '03-Feb-24 12:00:00 AM',
    Date_of_Issue: '04-May-12 12:00:00 AM',
    Ethnic_Group: 'Example group',
    Family: 'Example family',
    First_Name: 'Jane',
    Gender: 'F',
    ID_Number: '12345678',
    Occupation: 'Engineer',
    Other_Name: 'Mary',
    Pin: 'A001234567B',
    Place_of_Birth: 'Nairobi',
    Place_of_Death: 'Mombasa',
    Place_of_Live: 'Kisumu',
    RegOffice: 'Nairobi Central',
    Serial_Number: 'ABC123',
    Surname: 'Doe'
  }], 'GetDataByIdCardResult', 'req-fields');

  expect(mapped.person).toEqual({
    idNumber: '12345678',
    serialNumber: 'ABC123',
    firstName: 'Jane',
    otherNames: 'Mary',
    surname: 'Doe',
    gender: 'F',
    dateOfBirth: '01/02/1990 12:00:00 AM',
    dateOfBirthFromPassport: null,
    dateOfDeath: '03-Feb-24 12:00:00 AM',
    dateOfIssue: '04-May-12 12:00:00 AM',
    dateOfExpiry: null,
    placeOfBirth: 'Nairobi',
    placeOfDeath: 'Mombasa',
    placeOfLive: 'Kisumu',
    citizenship: 'Kenyan',
    clan: 'Example clan',
    ethnicGroup: 'Example group',
    family: 'Example family',
    occupation: 'Engineer',
    registrationOffice: 'Nairobi Central',
    pin: 'A001234567B'
  });
});

test('keeps all documented components when IPRS returns null values', () => {
  const mapped = mapIdentityResponse([{
    ErrorCode: '',
    ErrorMessage: '',
    ErrorOcurred: false,
    Citizenship: null,
    Clan: null,
    Date_of_Birth: null,
    Date_of_Death: null,
    Ethnic_Group: null,
    Family: null,
    Fingerprint: null,
    First_Name: 'WALACE',
    Gender: null,
    ID_Number: '37636674',
    Occupation: null,
    Other_Name: 'WASONGA',
    Photo: null,
    Pin: null,
    Place_of_Birth: null,
    Place_of_Death: null,
    Place_of_Live: null,
    Signature: null,
    Surname: 'OWILI',
    Date_of_Issue: null,
    RegOffice: null,
    Serial_Number: null
  }], 'GetDataByIdCardResult', 'req-null-fields');

  expect(mapped.person).toMatchObject({
    citizenship: null,
    clan: null,
    dateOfBirth: null,
    dateOfDeath: null,
    dateOfIssue: null,
    ethnicGroup: null,
    family: null,
    firstName: 'WALACE',
    gender: null,
    idNumber: '37636674',
    occupation: null,
    otherNames: 'WASONGA',
    pin: null,
    placeOfBirth: null,
    placeOfDeath: null,
    placeOfLive: null,
    registrationOffice: null,
    serialNumber: null,
    surname: 'OWILI'
  });
  expect(mapped.media).toMatchObject({
    photoAvailable: false,
    fingerprintAvailable: false,
    signatureAvailable: false,
    photo: null,
    fingerprint: null,
    signature: null
  });
});

test('unwraps WCF response and result containers before mapping identity fields', () => {
  const mapped = mapIdentityResponse([{
    GetDataByIdCardResponse: {
      GetDataByIDCardResult: {
        ErrorOccurred: false,
        ID_Number: '12345678',
        First_Name: 'Jane',
        Surname: 'Doe'
      }
    }
  }], 'GetDataByIdCardResult', 'req-2');

  expect(mapped.person).toMatchObject({
    idNumber: '12345678',
    firstName: 'Jane',
    surname: 'Doe'
  });
});

test('does not mark an empty IPRS response as verified', () => {
  const mapped = mapIdentityResponse([{ GetDataByIdCardResult: { ErrorOccurred: false } }], 'GetDataByIdCardResult', 'req-3');

  expect(mapped.errorOccurred).toBe(false);
  expect(mapped.verified).toBe(false);
  expect(Object.values(mapped.person).every((value) => value === null)).toBe(true);
});

test('includes only the response shape when explicitly enabled', () => {
  const original = process.env.IPRS_INCLUDE_RESPONSE_SHAPE;
  process.env.IPRS_INCLUDE_RESPONSE_SHAPE = 'true';

  const mapped = mapIdentityResponse([{ GetDataByIdCardResult: { ErrorOccurred: false } }], 'GetDataByIdCardResult', 'req-4');

  expect(mapped.iprsResponseShape).toEqual([
    '$[]',
    '$[].GetDataByIdCardResult',
    '$[].GetDataByIdCardResult.ErrorOccurred'
  ]);

  if (original === undefined) delete process.env.IPRS_INCLUDE_RESPONSE_SHAPE;
  else process.env.IPRS_INCLUDE_RESPONSE_SHAPE = original;
});

test('includes raw biometric fields only when explicitly enabled', () => {
  const original = process.env.IPRS_INCLUDE_BIOMETRICS;
  process.env.IPRS_INCLUDE_BIOMETRICS = 'true';

  const mapped = mapIdentityResponse([{
    ErrorOccurred: false,
    ID_Number: '12345678',
    Photo: 'a'.repeat(30),
    Signature: 'b'.repeat(30),
    Fingerprint: 'c'.repeat(30)
  }], 'GetDataByIdCardResult', 'req-5');

  expect(mapped.media).toMatchObject({
    photoAvailable: true,
    signatureAvailable: true,
    fingerprintAvailable: true,
    photo: 'a'.repeat(30),
    signature: 'b'.repeat(30),
    fingerprint: 'c'.repeat(30)
  });

  if (original === undefined) delete process.env.IPRS_INCLUDE_BIOMETRICS;
  else process.env.IPRS_INCLUDE_BIOMETRICS = original;
});

test.each([
  [1, true, 'MATCH'],
  ['Match', true, 'MATCH'],
  [0, false, 'NOT_MATCH'],
  ['NotMatch', false, 'NOT_MATCH'],
  [2, false, 'NO_FINGERS_IN_DB']
])('maps documented fingerprint result %p correctly', (Result, verified, verificationResult) => {
  const mapped = mapVerificationResponse([{
    VerificationByIDCardResponse: {
      VerificationByIDCardResult: { ErrorOccured: false, Result }
    }
  }], 'VerificationByIDCardResult', 'req-bio');

  expect(mapped).toMatchObject({
    errorOccurred: false,
    verified,
    result: verificationResult,
    verificationReference: 'req-bio'
  });
});

test('preserves documented misspelled ErrorOccured from fingerprint results', () => {
  const mapped = mapVerificationResponse([{
    VerificationByIDCardResult: {
      ErrorOccured: true,
      ErrorCode: 'ISB-116',
      ErrorMessage: 'Fingerprint which was sent is incorrect'
    }
  }], 'VerificationByIDCardResult', 'req-error');

  expect(mapped).toMatchObject({
    errorOccurred: true,
    iprsErrorCode: 'ISB-116'
  });
});

test('recognizes the ErrorOcurred spelling returned by the live IPRS service', () => {
  const mapped = mapIdentityResponse([{
    GetDataByIdCardResult: {
      ErrorOcurred: true,
      ErrorCode: 'ISB-105',
      ErrorMessage: 'There is no information for requested search parameters'
    }
  }], 'GetDataByIdCardResult', 'req-live-error');

  expect(mapped).toMatchObject({
    errorOccurred: true,
    iprsErrorCode: 'ISB-105',
    iprsErrorMessage: 'There is no information for requested search parameters'
  });
});
