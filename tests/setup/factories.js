import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User.js';
import { Room } from '../../src/models/Room.js';
import { RoomMember } from '../../src/models/RoomMember.js';
import { Draft } from '../../src/models/Draft.js';
import { env } from '../../src/config/env.js';

export async function createTestUser(displayName = 'TestUser') {
  const user = await User.create({ displayName });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, { expiresIn: '24h' });
  return {
    id: user._id.toString(),
    user,
    token,
  };
}

export async function createTestRoom(ownerId, name = 'Test Room') {
  const room = await Room.create({ name, ownerId });
  await RoomMember.create({ roomId: room._id, userId: ownerId, status: 'ACTIVE' });
  return {
    id: room._id.toString(),
    room,
  };
}

export async function joinTestRoom(roomId, userId) {
  const member = await RoomMember.create({ roomId, userId, status: 'ACTIVE' });
  return member;
}

export async function createTestDraft(ownerId, name = 'Test Draft') {
  const draft = await Draft.create({
    ownerId,
    name,
    durationMs: 10000,
    effect: 'NONE',
    fileUrl: 'https://example.com/audio.mp3',
  });
  return {
    id: draft._id.toString(),
    draft,
  };
}
