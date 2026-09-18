import mongoose from 'mongoose';
import { Room } from '../../models/Room.js';
import { RoomMember } from '../../models/RoomMember.js';
import { User } from '../../models/User.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { eventBus } from '../../lib/eventBus.js';

export async function createRoom(ownerId, data) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const room = new Room({
      name: data.name,
      ownerId,
    });
    await room.save({ session });

    await RoomMember.create(
      [
        {
          roomId: room._id,
          userId: ownerId,
          status: 'ACTIVE',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return getRoomState(room._id);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function getRoomState(roomId) {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new AppError(ErrorCodes.ROOM_NOT_FOUND, 'Room not found', 404);
  }

  const activeMembers = await RoomMember.find({ roomId, status: 'ACTIVE' })
    .populate('userId', 'displayName')
    .sort({ joinedAt: 1 });

  return {
    id: room._id.toString(),
    name: room.name,
    ownerId: room.ownerId.toString(),
    status: room.status,
    participantCount: activeMembers.length,
    participants: activeMembers.map((m) => ({
      userId: m.userId._id ? m.userId._id.toString() : m.userId.toString(),
      displayName: m.userId.displayName || '',
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    activeSpinId: null,
  };
}

// TODO: room capacity check and join mutation are not wrapped in a single database lock; heavy concurrent joins could briefly breach 20 active members.
export async function joinRoom(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new AppError(ErrorCodes.ROOM_NOT_FOUND, 'Room not found', 404);
  }

  const existingMember = await RoomMember.findOne({ roomId, userId });

  if (existingMember && existingMember.status === 'ACTIVE') {
    return getRoomState(roomId);
  }

  const activeCount = await RoomMember.countDocuments({ roomId, status: 'ACTIVE' });
  if (activeCount >= 20) {
    throw new AppError(
      ErrorCodes.TOO_MANY_PLAYERS,
      'Room has reached maximum capacity of 20 active members',
      422
    );
  }

  const user = await User.findById(userId);

  if (existingMember && existingMember.status === 'LEFT') {
    existingMember.status = 'ACTIVE';
    existingMember.leftAt = null;
    existingMember.lastSeenAt = new Date();
    await existingMember.save();
  } else {
    await RoomMember.create({
      roomId,
      userId,
      status: 'ACTIVE',
    });
  }

  eventBus.emit('user_joined', {
    roomId: roomId.toString(),
    userId: userId.toString(),
    displayName: user ? user.displayName : '',
  });

  return getRoomState(roomId);
}

export async function leaveRoom(roomId, userId) {
  const member = await RoomMember.findOne({ roomId, userId });
  if (!member || member.status === 'LEFT') {
    throw new AppError(ErrorCodes.NOT_A_MEMBER, 'User is not an active member of this room', 409);
  }

  member.status = 'LEFT';
  member.leftAt = new Date();
  await member.save();

  eventBus.emit('user_left', {
    roomId: roomId.toString(),
    userId: userId.toString(),
  });

  return getRoomState(roomId);
}
