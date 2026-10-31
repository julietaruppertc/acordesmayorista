const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Core health', () => {
  it('responde con el nombre del servicio y un trace id', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('core-service');
    expect(response.body.traceId).toBeTruthy();
  });

  it('propaga el trace id recibido', async () => {
    const response = await request(app)
      .get('/health')
      .set('X-Trace-Id', 'trace-test-001')
      .expect(200);
    expect(response.body.traceId).toBe('trace-test-001');
    expect(response.headers['x-trace-id']).toBe('trace-test-001');
  });
});

afterAll(async () => {
  await pool.end();
});
