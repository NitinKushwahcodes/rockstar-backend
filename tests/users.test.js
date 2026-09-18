import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';

describe('User Module Endpoints', () => {
  before(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it('POST /api/v1/users creates user and returns token', async () => {
    const res = await supertest(app)
      .post('/api/v1/users')
      .send({ displayName: 'Alice' });

    assert.equal(res.status, 201);
    assert.ok(res.body.user.id);
    assert.equal(res.body.user.displayName, 'Alice');
    assert.ok(res.body.token);
  });

  it('POST /api/v1/users returns 400 when displayName is missing', async () => {
    const res = await supertest(app)
      .post('/api/v1/users')
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  });
});
