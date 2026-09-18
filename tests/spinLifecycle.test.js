import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';
import { createTestUser, createTestRoom, joinTestRoom } from './setup/factories.js';
import { getSpinState } from '../src/modules/spins/spin.service.js';

describe('Spin Lifecycle Happy Path', () => {
  before(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    process.env.SPIN_INTERVAL_MS = '100';
  });

  after(async () => {
    await teardownTestDb();
  });

  it('runs full happy path lifecycle with 3 players to completion', async () => {
    process.env.SPIN_INTERVAL_MS = '100';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('User2');
    const u3 = await createTestUser('User3');

    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const startRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(startRes.status, 201);
    const spinId = startRes.body.spin.id;
    assert.equal(startRes.body.spin.status, 'RUNNING');
    assert.equal(startRes.body.spin.participantCount, 3);

    // Allow time for transaction ticks over Atlas network connection
    await new Promise((r) => setTimeout(r, 2000));

    const finalState = await getSpinState(spinId);
    assert.equal(finalState.status, 'COMPLETED');
    assert.ok(finalState.winnerId);
    assert.equal(finalState.eliminations.length, 2);

    const restRes = await supertest(app)
      .get(`/api/v1/spins/${spinId}`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(restRes.status, 200);
    assert.equal(restRes.body.spin.status, 'COMPLETED');
    assert.equal(restRes.body.spin.winnerId, finalState.winnerId);
  });
});
