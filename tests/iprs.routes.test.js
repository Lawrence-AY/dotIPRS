process.env.IPRS_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';
process.env.IPRS_USERNAME = 'test-user';
process.env.IPRS_PASSWORD = 'test-password';
process.env.IPRS_PUBLIC_TEST_ENDPOINT = 'true';
process.env.AUTH_SESSION_USERNAME = 'test-user';
process.env.AUTH_SESSION_PASSWORD = 'test-password';
process.env.AUTH_SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const app = require('../src/app');

async function createBearerToken() {
  const res = await request(app)
    .post('/api/v1/auth/session')
    .send({ username: 'test-user', password: 'test-password' })
    .expect(200);

  expect(res.body.success).toBe(true);
  expect(res.body.data.tokenType).toBe('Bearer');
  expect(res.body.data.token).toBeTruthy();

  return res.body.data.token;
}

test('returns IPRS health without credentials', async () => {
  const res = await request(app).get('/api/v1/iprs/health').expect(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.service).toBe('IPRS');
  expect(res.body.data.username).toBeUndefined();
  expect(res.body.data.password).toBeUndefined();
});

test('requires a session bearer token for verification', async () => {
  const res = await request(app)
    .post('/api/v1/iprs/verify/id')
    .send({ idNumber: '12345678' })
    .expect(401);

  expect(res.body.code).toBe('AUTH_REQUIRED');
  expect(res.body.message).toContain('/api/v1/auth/session');
});

test('rejects API keys without a gateway session', async () => {
  const res = await request(app)
    .post('/api/v1/iprs/verify/id')
    .set('X-API-Key', 'test-iprs-api-key')
    .send({ idNumber: '12345678' })
    .expect(401);

  expect(res.body.code).toBe('AUTH_REQUIRED');
});

test('allows a tightly rate-limited temporary ID test without a bearer token when enabled', async () => {
  const res = await request(app)
    .post('/api/v1/iprs/test/id')
    .send({ idNumber: '12345678' })
    .expect(200);

  expect(res.body.success).toBe(true);
  expect(res.body.data.person.idNumber).toBe('12345678');
});

test('accepts a bearer token from the session endpoint', async () => {
  const token = await createBearerToken();

  const res = await request(app)
    .post('/api/v1/iprs/verify/id')
    .set('Authorization', `Bearer ${token}`)
    .send({ idNumber: '12345678' })
    .expect(200);

  expect(res.body.success).toBe(true);
});

test('supports PIN lookups through both the dedicated and compatible ID routes', async () => {
  const token = await createBearerToken();

  for (const path of ['/api/v1/iprs/verify/pin', '/api/v1/iprs/verify/id']) {
    const res = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: 'A001234567B' })
      .expect(200);

    expect(res.body.data.person.pin).toBe('A001234567B');
  }
});
