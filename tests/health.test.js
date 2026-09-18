import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './setup/testDb.js';

describe('Health and Readiness Probes', () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it('GET /healthz returns 200 ok', async () => {
    const res = await supertest(app).get('/healthz');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('GET /readyz returns 200 ready when DB is connected', async () => {
    const res = await supertest(app).get('/readyz');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.db, 'up');
  });
});
