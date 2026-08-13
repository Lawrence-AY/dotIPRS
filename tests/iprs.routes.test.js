process.env.IPRS_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';
process.env.IPRS_USERNAME = 'test-user';
process.env.IPRS_PASSWORD = 'test-password';

const request = require('supertest');
const app = require('../src/app');

test('returns IPRS health without credentials', async () => {
  const res = await request(app).get('/api/v1/iprs/health').expect(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.service).toBe('IPRS');
  expect(res.body.data.username).toBeUndefined();
  expect(res.body.data.password).toBeUndefined();
});

test('requires auth for verification', async () => {
  const res = await request(app)
    .post('/api/v1/iprs/verify/id')
    .send({ idNumber: '12345678' })
    .expect(401);

  expect(res.body.code).toBe('AUTH_REQUIRED');
  expect(res.body.message).toContain('/api/v1/auth/session');
});

test('creates session from env credentials and accepts bearer token', async () => {
  const session = await request(app)
    .post('/api/v1/auth/session')
    .send({ username: 'test-user', password: 'test-password' })
    .expect(200);

  const res = await request(app)
    .post('/api/v1/iprs/verify/id')
    .set('Authorization', `Bearer ${session.body.data.token}`)
    .send({ idNumber: '12345678' })
    .expect(200);

  expect(res.body.success).toBe(true);
});
