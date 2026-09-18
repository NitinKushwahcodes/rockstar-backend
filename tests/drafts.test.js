import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';
import { createTestUser, createTestRoom, createTestDraft } from './setup/factories.js';

describe('Draft Module Endpoints', () => {
  before(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it('POST /api/v1/drafts creates draft', async () => {
    const user = await createTestUser('Musician');

    const res = await supertest(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'Cool Guitar Loop',
        durationMs: 15000,
        effect: 'REVERB',
        fileUrl: 'https://example.com/loop.wav',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.draft.name, 'Cool Guitar Loop');
    assert.equal(res.body.draft.effect, 'REVERB');
  });

  it('POST /api/v1/rooms/:roomId/drafts shares draft to room and duplicate share is idempotent', async () => {
    const owner = await createTestUser('Owner');
    const { id: roomId } = await createTestRoom(owner.id);
    const { id: draftId } = await createTestDraft(owner.id);

    // First share
    const shareRes1 = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/drafts`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ draftId });

    assert.equal(shareRes1.status, 200);
    assert.equal(shareRes1.body.draft.id, draftId);

    // Duplicate share — idempotent
    const shareRes2 = await supertest(app)
      .post(`/api/v1/rooms/${roomId}/drafts`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ draftId });

    assert.equal(shareRes2.status, 200);
    assert.equal(shareRes2.body.draft.id, draftId);
  });
});
