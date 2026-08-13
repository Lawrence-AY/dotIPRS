function unwrapResult(raw, resultKey) {
  if (!raw) return {};
  if (Array.isArray(raw)) return unwrapResult(raw[0], resultKey);
  return raw[resultKey] || raw;
}

function getFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function hasImage(value) {
  return typeof value === 'string' && value.length > 20;
}

function mapIdentityResponse(rawResponse, resultKey, requestId) {
  const result = unwrapResult(rawResponse, resultKey);
  const errorOccurred = getFirst(result.ErrorOccurred, result.errorOccurred, false);

  if (errorOccurred === true || errorOccurred === 'true') {
    return {
      errorOccurred: true,
      iprsErrorCode: getFirst(result.ErrorCode, result.errorCode),
      iprsErrorMessage: getFirst(result.ErrorMessage, result.errorMessage)
    };
  }

  return {
    errorOccurred: false,
    verified: true,
    source: 'IPRS',
    verificationReference: requestId,
    person: {
      idNumber: getFirst(result.IDNumber, result.IdNumber, result.NationalId, result.idNumber),
      firstName: getFirst(result.FirstName, result.FName, result.firstName),
      otherNames: getFirst(result.OtherNames, result.MiddleName, result.otherNames),
      surname: getFirst(result.Surname, result.LastName, result.surname),
      gender: getFirst(result.Gender, result.Sex, result.gender),
      dateOfBirth: getFirst(result.DateOfBirth, result.DOB, result.dateOfBirth),
      placeOfBirth: getFirst(result.PlaceOfBirth, result.placeOfBirth),
      citizenship: getFirst(result.Citizenship, result.Nationality, result.citizenship),
      occupation: getFirst(result.Occupation, result.occupation),
      kraPin: getFirst(result.KRAPin, result.Pin, result.kraPin)
    },
    media: {
      photoAvailable: hasImage(getFirst(result.Photo, result.PhotoData, result.photo)),
      signatureAvailable: hasImage(getFirst(result.Signature, result.SignatureData, result.signature)),
      fingerprintAvailable: hasImage(getFirst(result.Fingerprint, result.FingerprintData, result.fingerprint))
    }
  };
}

function mapVerificationResponse(rawResponse, resultKey, requestId) {
  const mapped = mapIdentityResponse(rawResponse, resultKey, requestId);
  if (mapped.errorOccurred) return mapped;

  return {
    ...mapped,
    verified: getFirst(rawResponse && rawResponse.Verified, mapped.verified, true) !== false
  };
}

module.exports = {
  mapIdentityResponse,
  mapVerificationResponse,
  unwrapResult
};
