const { validateBase64Image, getImageMimeType, validateFingerprintBmp } = require('../src/modules/iprs/utils/iprs.image.utils');

test('validates Base64 BMP fingerprints', () => {
  const bmp = Buffer.from('BMtest').toString('base64');
  expect(validateBase64Image(bmp)).toBe(true);
  expect(getImageMimeType(bmp)).toBe('image/bmp');
  expect(validateFingerprintBmp(bmp)).toBe(true);
});

test('rejects malformed Base64 image strings', () => {
  expect(validateBase64Image('not base64 !!!')).toBe(false);
});
