const IPRS_RESULT_FIELDS = new Set([
  'erroroccurred', 'erroroccured', 'errorocurred', 'errorcode', 'errormessage',
  'id_number', 'idnumber', 'first_name', 'firstname', 'surname',
  'serial_number', 'serialnumber', 'photo', 'signature', 'fingerprint',
  // FingerprintVerificationResult has no person fields.  Its outcome is
  // carried by Result (0 = NotMatch, 1 = Match, 2 = NoFingersInDb).
  'result'
]);

function hasIPRSResultFields(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).some((key) => IPRS_RESULT_FIELDS.has(key.toLowerCase()));
}

function findNestedIPRSResult(value, visited = new Set()) {
  if (!value || typeof value !== 'object' || visited.has(value)) return null;
  if (hasIPRSResultFields(value)) return value;

  visited.add(value);
  for (const child of Object.values(value)) {
    const result = findNestedIPRSResult(child, visited);
    if (result) return result;
  }

  return null;
}

function unwrapResult(raw, resultKey) {
  if (!raw) return {};
  if (Array.isArray(raw)) return unwrapResult(raw[0], resultKey);
  if (typeof raw !== 'object') return raw;

  // node-soap normally returns the Result object directly, but WCF services
  // can retain a <MethodResponse><MethodResult> wrapper. Match keys without
  // relying on the provider's Id/ID casing and keep unwrapping until the
  // actual HumanInfo object is reached.
  const normalizedResultKey = resultKey.toLowerCase();
  const resultProperty = Object.keys(raw).find((key) => key.toLowerCase() === normalizedResultKey);
  if (resultProperty) return unwrapResult(raw[resultProperty], resultKey);

  const responseKey = resultKey.replace(/Result$/i, 'Response').toLowerCase();
  const responseProperty = Object.keys(raw).find((key) => key.toLowerCase() === responseKey);
  if (responseProperty) return unwrapResult(raw[responseProperty], resultKey);

  return findNestedIPRSResult(raw) || raw;
}

function getFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function nullIfMissing(value) {
  return value === undefined ? null : value;
}

function hasImage(value) {
  return typeof value === 'string' && value.length > 20;
}

function isTrue(value) {
  return value === true || String(value).trim().toLowerCase() === 'true';
}

function fingerprintOutcome(value) {
  const normalized = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'match') return { verified: true, result: 'MATCH' };
  if (normalized === '0' || normalized === 'notmatch' || normalized === 'not_match') {
    return { verified: false, result: 'NOT_MATCH' };
  }
  if (normalized === '2' || normalized === 'nofingersindb' || normalized === 'no_fingers_in_db') {
    return { verified: false, result: 'NO_FINGERS_IN_DB' };
  }
  return { verified: false, result: 'UNKNOWN' };
}

function describeResponseShape(value, path = '$', depth = 0, paths = []) {
  if (!value || typeof value !== 'object' || depth > 5 || paths.length >= 80) return paths;

  if (Array.isArray(value)) {
    paths.push(`${path}[]`);
    if (value.length) describeResponseShape(value[0], `${path}[]`, depth + 1, paths);
    return paths;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    paths.push(childPath);
    describeResponseShape(child, childPath, depth + 1, paths);
    if (paths.length >= 80) break;
  }

  return paths;
}

function mapIdentityResponse(rawResponse, resultKey, requestId) {
  const result = unwrapResult(rawResponse, resultKey);
  const errorOccurred = getFirst(
    result.ErrorOccurred,
    result.ErrorOccured,
    result.ErrorOcurred,
    result.errorOccurred,
    result.errorOccured,
    result.errorOcurred,
    false
  );

  if (isTrue(errorOccurred)) {
    return {
      errorOccurred: true,
      iprsErrorCode: getFirst(result.ErrorCode, result.errorCode),
      iprsErrorMessage: getFirst(result.ErrorMessage, result.errorMessage)
    };
  }

  const person = {
    // IPRS basicHttpBinding uses underscore-separated field names.
    idNumber: getFirst(result.ID_Number, result.IDNumber, result.IdNumber, result.NationalId, result.idNumber),
    serialNumber: getFirst(result.Serial_Number, result.SerialNumber, result.serialNumber),
    firstName: getFirst(result.First_Name, result.FirstName, result.FName, result.firstName),
    otherNames: getFirst(result.Other_Name, result.OtherNames, result.MiddleName, result.otherNames),
    surname: getFirst(result.Surname, result.LastName, result.surname),
    gender: getFirst(result.Gender, result.Sex, result.gender),
    dateOfBirth: getFirst(result.Date_of_Birth, result.DateOfBirth, result.DOB, result.dateOfBirth),
    dateOfBirthFromPassport: getFirst(result.Date_of_Birth_from_Passport, result.DateOfBirthFromPassport, result.dateOfBirthFromPassport),
    dateOfDeath: getFirst(result.Date_of_Death, result.DateOfDeath, result.dateOfDeath),
    dateOfIssue: getFirst(result.Date_of_Issue, result.DateOfIssue, result.dateOfIssue),
    dateOfExpiry: getFirst(result.Date_of_Expiry, result.Date_of_expiry, result.DateOfExpiry, result.dateOfExpiry),
    placeOfBirth: getFirst(result.Place_of_Birth, result.PlaceOfBirth, result.placeOfBirth),
    placeOfDeath: getFirst(result.Place_of_Death, result.PlaceOfDeath, result.placeOfDeath),
    placeOfLive: getFirst(result.Place_of_Live, result.PlaceOfLive, result.placeOfLive),
    citizenship: getFirst(result.Citizenship, result.Nationality, result.citizenship),
    clan: getFirst(result.Clan, result.clan),
    ethnicGroup: getFirst(result.Ethnic_Group, result.EthnicGroup, result.ethnicGroup),
    family: getFirst(result.Family, result.family),
    occupation: getFirst(result.Occupation, result.occupation),
    registrationOffice: getFirst(result.RegOffice, result.RegistrationOffice, result.registrationOffice),
    // Pin is the name used in the IPRS service contract. KRAPin is accepted
    // as a provider variant, but the public JSON response remains consistent.
    pin: getFirst(result.Pin, result.KRAPin, result.PIN, result.pin, result.kraPin)
  };

  // IPRS omits optional fields from some SOAP responses. Keep a stable REST
  // schema so clients can render all documented identity components without
  // having to distinguish an omitted property from an unavailable value.
  for (const key of Object.keys(person)) person[key] = nullIfMissing(person[key]);

  const photo = getFirst(result.Photo, result.PhotoData, result.photo);
  const passportPhoto = getFirst(result.Photo_from_Passport, result.PhotoFromPassport, result.passportPhoto);
  const signature = getFirst(result.Signature, result.SignatureData, result.signature);
  const fingerprint = getFirst(result.Fingerprint, result.FingerprintData, result.fingerprint);
  const media = {
    photoAvailable: hasImage(getFirst(photo, passportPhoto)),
    passportPhotoAvailable: hasImage(passportPhoto),
    signatureAvailable: hasImage(signature),
    fingerprintAvailable: hasImage(fingerprint),
    // Null means the item is not returned or is intentionally withheld.
    // Raw biometric data requires the explicit authorized deployment setting.
    photo: null,
    passportPhoto: null,
    signature: null,
    fingerprint: null
  };

  if (process.env.IPRS_INCLUDE_BIOMETRICS === 'true') {
    media.photo = photo;
    media.passportPhoto = passportPhoto;
    media.signature = signature;
    media.fingerprint = fingerprint;
  }

  const mapped = {
    errorOccurred: false,
    verified: Object.values(person).some((value) => value !== null),
    source: 'IPRS',
    verificationReference: requestId,
    person,
    media
  };

  // This is deliberately opt-in: it exposes only field names and nesting,
  // never IPRS values or biometric data. Use it to align a deployed WSDL.
  if (process.env.IPRS_INCLUDE_RESPONSE_SHAPE === 'true') {
    mapped.iprsResponseShape = describeResponseShape(rawResponse);
  }

  return mapped;
}

function mapVerificationResponse(rawResponse, resultKey, requestId) {
  const result = unwrapResult(rawResponse, resultKey);
  const errorOccurred = getFirst(
    result.ErrorOccurred,
    result.ErrorOccured,
    result.ErrorOcurred,
    result.errorOccurred,
    result.errorOccured,
    result.errorOcurred,
    false
  );

  if (isTrue(errorOccurred)) {
    return {
      errorOccurred: true,
      iprsErrorCode: getFirst(result.ErrorCode, result.errorCode),
      iprsErrorMessage: getFirst(result.ErrorMessage, result.errorMessage)
    };
  }

  const outcome = fingerprintOutcome(getFirst(result.Result, result.result, result.Verified, result.verified));
  return {
    errorOccurred: false,
    ...outcome,
    source: 'IPRS',
    verificationReference: requestId
  };
}

module.exports = {
  mapIdentityResponse,
  mapVerificationResponse,
  unwrapResult,
  describeResponseShape,
  fingerprintOutcome,
  nullIfMissing
};
