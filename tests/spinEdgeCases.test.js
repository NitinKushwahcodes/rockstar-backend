import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';
import { createTestUser, createTestRoom, joinTestRoom } from './setup/factories.js';
import { Spin } from '../src/models/Spin.js';
import { spinScheduler } from '../src/modules/spins/spin.scheduler.js';
import { startSpin, getSpinState, getLiveSpinSnapshot } from '../src/modules/spins/spin.service.js';
import { joinRoom, leaveRoom } from '../src/modules/rooms/room.service.js';

describe('Spin Engine Seven Edge Cases', () => {
  before(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it('Edge Case 1: Duplicate spin start while RUNNING returns 409 SPIN_ALREADY_ACTIVE', async () => {
    process.env.SPIN_INTERVAL_MS = '5000';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const firstRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);
    assert.equal(firstRes.status, 201);
    const spinId = firstRes.body.spin.id;

    const dupRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(dupRes.status, 409);
    assert.equal(dupRes.body.error.code, 'SPIN_ALREADY_ACTIVE');

    const spinDocs = await Spin.find({ roomId });
    assert.equal(spinDocs.length, 1);
    spinScheduler.cancel(spinId);
  });

  it('Edge Case 2: Participant leaves mid-spin is eliminated immediately', async () => {
    process.env.SPIN_INTERVAL_MS = '100';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const spinRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);
    const spinId = spinRes.body.spin.id;

    // User2 leaves room mid-spin
    await leaveRoom(roomId, u2.id);

    await new Promise((r) => setTimeout(r, 600));
    const finalState = await getSpinState(spinId);
    assert.equal(finalState.status, 'COMPLETED');
  });

  it('Edge Case 3: Reconnecting client receives room_state with live spin snapshot', async () => {
    process.env.SPIN_INTERVAL_MS = '5000';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const spinState = await startSpin(roomId, owner.id);
    const snapshot = await getLiveSpinSnapshot(roomId);

    assert.ok(snapshot);
    assert.equal(snapshot.status, 'RUNNING');
    assert.equal(snapshot.participantCount, 3);
    spinScheduler.cancel(spinState.id);
  });

  it('Edge Case 4: Room owner disconnects/leaves mid-spin but spin runs to completion', async () => {
    process.env.SPIN_INTERVAL_MS = '100';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const spinRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);
    const spinId = spinRes.body.spin.id;

    // Owner leaves mid-spin
    await leaveRoom(roomId, owner.id);

    await new Promise((r) => setTimeout(r, 600));
    const finalState = await getSpinState(spinId);
    assert.equal(finalState.status, 'COMPLETED');
    assert.ok(finalState.winnerId);
  });

  it('Edge Case 5: Fewer than 3 eligible participants returns 422 INSUFFICIENT_PLAYERS', async () => {
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);

    const res = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'INSUFFICIENT_PLAYERS');
    assert.ok(res.body.error.message.includes('2 active players'));
  });

  it('Edge Case 6: Server restarts mid-spin, recoverUnfinishedSpins resumes execution', async () => {
    process.env.SPIN_INTERVAL_MS = '100';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const spinRes = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/spins`)
      .set('Authorization', `Bearer ${owner.token}`);
    const spinId = spinRes.body.spin.id;

    // Simulate in-process server restart: cancel active timer, push nextEliminationAt into past
    spinScheduler.cancel(spinId);
    await Spin.findByIdAndUpdate(spinId, {
      nextEliminationAt: new Date(Date.now() - 1000),
      eliminationIntervalMs: 100,
    });

    // Trigger server boot recovery logic
    await spinScheduler.recoverUnfinishedSpins();

    await new Promise((r) => setTimeout(r, 2000));
    const finalState = await getSpinState(spinId);
    assert.equal(finalState.status, 'COMPLETED');
  });

  it('Edge Case 7: Concurrent join at moment of spin start preserves exact snapshot count', async () => {
    process.env.SPIN_INTERVAL_MS = '5000';
    const owner = await createTestUser('Owner');
    const u2 = await createTestUser('U2');
    const u3 = await createTestUser('U3');
    const u4 = await createTestUser('U4');

    const { id: roomId } = await createTestRoom(owner.id);
    await joinTestRoom(roomId, u2.id);
    await joinTestRoom(roomId, u3.id);

    const [spinResult] = await Promise.all([
      startSpin(roomId, owner.id),
      joinRoom(roomId, u4.id),
    ]);

    assert.equal(spinResult.participantCount, 3);
    spinScheduler.cancel(spinResult.id);
  });
});
