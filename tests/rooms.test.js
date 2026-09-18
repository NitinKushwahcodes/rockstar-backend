import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';
import { createTestUser } from './setup/factories.js';

describe('Room Module Endpoints', () => {
  before(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it('POST /api/v1/rooms creates room and adds owner as ACTIVE member', async () => {
    const owner = await createTestUser('Owner');

    const res = await supertest(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Rockstar Room' });

    assert.equal(res.status, 201);
    assert.equal(res.body.room.name, 'Rockstar Room');
    assert.equal(res.body.room.ownerId, owner.id);
    assert.equal(res.body.room.participantCount, 1);
    assert.equal(res.body.room.participants[0].userId, owner.id);
  });

  it('POST /api/v1/rooms/:roomId/join is idempotent for active member', async () => {
    const owner = await createTestUser('Owner');
    const createRes = await supertest(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Test Room' });

    const roomId = createRes.body.room.id;

    const joinRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(joinRes.status, 200);
    assert.equal(joinRes.body.room.participantCount, 1);
  });

  it('POST /api/v1/rooms/:roomId/leave marks user as LEFT', async () => {
    const owner = await createTestUser('Owner');
    const roomRes = await supertest(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Test Room' });

    const roomId = roomRes.body.room.id;

    const leaveRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(leaveRes.status, 200);
    assert.equal(leaveRes.body.room.participantCount, 0);
  });

  it('GET /api/v1/rooms/:roomId with invalid ObjectId returns 400 VALIDATION_FAILED', async () => {
    const owner = await createTestUser('Owner');
    const res = await supertest(app)
      .get('/api/v1/rooms/invalid-id')
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  });

  it('GET /api/v1/rooms/:roomId with non-existent ObjectId returns 404 ROOM_NOT_FOUND', async () => {
    const owner = await createTestUser('Owner');
    const res = await supertest(app)
      .get('/api/v1/rooms/000000000000000000000000')
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'ROOM_NOT_FOUND');
  });
});
