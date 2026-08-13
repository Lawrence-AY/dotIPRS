const BMP_SIGNATURE = 'Qk';
const PNG_SIGNATURE = 'iVBORw0KGgo';
const JPEG_SIGNATURES = ['/9j/2', '/9j/4'];

function stripDataUri(value) {
  if (!value || typeof value !== 'string') return '';
  return value.includes(',') ? value.split(',').pop() : value;
}

function validateBase64Image(value) {
  const base64 = stripDataUri(value);
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;

  try {
    return Buffer.from(base64, 'base64').length > 0;
  } catch (_) {
    return false;
  }
}

function getImageMimeType(value) {
  const base64 = stripDataUri(value);
  if (!validateBase64Image(base64)) return null;
  if (base64.startsWith(BMP_SIGNATURE)) return 'image/bmp';
  if (base64.startsWith(PNG_SIGNATURE)) return 'image/png';
  if (JPEG_SIGNATURES.some((signature) => base64.startsWith(signature))) return 'image/jpeg';
  return 'application/octet-stream';
}

function decodeBase64Image(value) {
  if (!validateBase64Image(value)) {
    const error = new Error('Invalid Base64 image.');
    error.code = 'INVALID_BASE64_IMAGE';
    throw error;
  }

  return {
    buffer: Buffer.from(stripDataUri(value), 'base64'),
    mimeType: getImageMimeType(value)
  };
}

function validateFingerprintBmp(value) {
  return validateBase64Image(value) && getImageMimeType(value) === 'image/bmp';
}

module.exports = {
  stripDataUri,
  validateBase64Image,
  getImageMimeType,
  decodeBase64Image,
  validateFingerprintBmp
};
