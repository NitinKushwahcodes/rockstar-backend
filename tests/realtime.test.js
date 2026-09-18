import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { setupTestDb, clearTestDb, teardownTestDb } from './setup/testDb.js';
import { createTestUser, createTestRoom, joinTestRoom } from './setup/factories.js';
import { initSocketGateway } from '../src/realtime/gateway.js';
import { connectTestSocket, waitForEvent } from './setup/socketClient.js';

describe('Realtime Socket Gateway', () => {
  let server;
  let baseUrl;

  before(async () => {
    await setupTestDb();
    server = http.createServer(app);
    initSocketGateway(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await teardownTestDb();
  });

  it('rejects connection handshake with invalid JWT token', async () => {
    const owner = await createTestUser('Owner');
    const { id: roomId } = await createTestRoom(owner.id);

    const socket = connectTestSocket(baseUrl, 'invalid-token', roomId);
    const errPayload = await waitForEvent(socket, 'connect_error');
    assert.ok(errPayload.message.includes('Unauthorized') || errPayload.message.includes('token'));
    socket.disconnect();
  });

  it('connects valid member socket and receives room_state', async () => {
    const owner = await createTestUser('Owner');
    const { id: roomId } = await createTestRoom(owner.id);

    const socket = connectTestSocket(baseUrl, owner.token, roomId);
    const state = await waitForEvent(socket, 'room_state');
    assert.equal(state.room.id, roomId);
    assert.equal(state.room.participantCount, 1);
    socket.disconnect();
  });
});
