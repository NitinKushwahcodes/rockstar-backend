import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Spin } from '../../models/Spin.js';
import { SpinParticipant } from '../../models/SpinParticipant.js';
import { SpinEvent } from '../../models/SpinEvent.js';
import { Room } from '../../models/Room.js';
import { RoomMember } from '../../models/RoomMember.js';
import { env } from '../../config/env.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { eventBus } from '../../lib/eventBus.js';
import { spinScheduler } from './spin.scheduler.js';

function getSpinIntervalMs() {
  return process.env.SPIN_INTERVAL_MS ? Number(process.env.SPIN_INTERVAL_MS) : env.SPIN_INTERVAL_MS;
}

async function runWithTransactionRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();

      const isTransient =
        err.code === 112 ||
        err.hasErrorLabel?.('TransientTransactionError') ||
        err.errmsg?.includes('Write conflict');

      if (isTransient && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function startSpin(roomId, requesterId) {
  const createdSpin = await runWithTransactionRetry(async (session) => {
    const room = await Room.findById(roomId).session(session);
    if (!room || room.status !== 'OPEN') {
      throw new AppError(ErrorCodes.ROOM_NOT_FOUND, 'Room not found or is closed', 404);
    }

    if (room.ownerId.toString() !== requesterId) {
      throw new AppError(ErrorCodes.NOT_ROOM_OWNER, 'Only the room owner can start a spin', 403);
    }

    const eligibleMembers = await RoomMember.find({ roomId, status: 'ACTIVE' })
      .populate('userId', 'displayName')
      .session(session);

    const validMembers = eligibleMembers.filter((m) => m.userId != null);

    if (validMembers.length < 3) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_PLAYERS,
        `Cannot start spin: room has ${validMembers.length} active players, minimum required is 3`,
        422
      );
    }

    if (validMembers.length > 20) {
      throw new AppError(
        ErrorCodes.TOO_MANY_PLAYERS,
        'Cannot start spin: room exceeds maximum 20 players',
        422
      );
    }

    const now = new Date();
    const intervalMs = getSpinIntervalMs();
    const nextEliminationAt = new Date(now.getTime() + intervalMs);

    const spin = new Spin({
      roomId,
      startedById: requesterId,
      status: 'RUNNING',
      startedAt: now,
      nextEliminationAt,
      eliminationIntervalMs: intervalMs,
    });
    await spin.save({ session });

    const participantDocs = validMembers.map((m) => ({
      spinId: spin._id,
      userId: m.userId._id,
      status: 'ACTIVE',
    }));
    await SpinParticipant.insertMany(participantDocs, { session });

    await SpinEvent.create(
      [
        {
          spinId: spin._id,
          roomId,
          type: 'spin_started',
          payload: {
            spinId: spin._id.toString(),
            roomId: roomId.toString(),
            participantIds: validMembers.map((m) => m.userId._id.toString()),
          },
          sequence: 0,
        },
      ],
      { session }
    );

    return spin;
  }).catch((err) => {
    if (err.code === 11000 || err.errorResponse?.code === 11000) {
      throw new AppError(
        ErrorCodes.SPIN_ALREADY_ACTIVE,
        'An active spin is already running in this room',
        409
      );
    }
    throw err;
  });

  const spinState = await getSpinState(createdSpin._id.toString());

  eventBus.emit('spin_started', {
    spinId: createdSpin._id.toString(),
    roomId: roomId.toString(),
    startedAt: createdSpin.startedAt,
    nextEliminationAt: createdSpin.nextEliminationAt,
    participants: spinState.participants,
  });

  spinScheduler.schedule(createdSpin._id.toString(), new Date(createdSpin.nextEliminationAt).getTime());

  return spinState;
}

export async function executeEliminationTick(spinId) {
  const result = await runWithTransactionRetry(async (session) => {
    const spin = await Spin.findById(spinId).session(session);
    if (!spin || spin.status !== 'RUNNING') {
      return { isCompleted: true };
    }

    const rawParticipants = await SpinParticipant.find({ spinId, status: 'ACTIVE' })
      .populate('userId', 'displayName')
      .session(session);

    const activeParticipants = rawParticipants.filter((p) => p.userId != null);

    if (activeParticipants.length === 1) {
      const winner = activeParticipants[0];
      winner.status = 'WINNER';
      await winner.save({ session });

      spin.status = 'COMPLETED';
      spin.completedAt = new Date();
      spin.winnerId = winner.userId._id;
      await spin.save({ session });

      const eventCount = await SpinEvent.countDocuments({ spinId }).session(session);
      await SpinEvent.create(
        [
          {
            spinId: spin._id,
            roomId: spin.roomId,
            type: 'winner_announced',
            payload: {
              winnerId: winner.userId._id.toString(),
              displayName: winner.userId.displayName,
            },
            sequence: eventCount,
          },
        ],
        { session }
      );

      return {
        isCompleted: true,
        eventPayloadToEmit: {
          type: 'winner_announced',
          data: {
            spinId: spin._id.toString(),
            roomId: spin.roomId.toString(),
            winnerId: winner.userId._id.toString(),
            winnerDisplayName: winner.userId.displayName,
          },
        },
      };
    }

    if (activeParticipants.length === 0) {
      spin.status = 'ABORTED';
      await spin.save({ session });
      return { isCompleted: true };
    }

    // crypto.randomInt is used instead of Math.random() to provide cryptographically uniform random selection without modulo bias.
    const chosenIndex = crypto.randomInt(0, activeParticipants.length);
    const chosen = activeParticipants[chosenIndex];

    const eliminatedCount = await SpinParticipant.countDocuments({
      spinId,
      status: 'ELIMINATED',
    }).session(session);
    const eliminationOrder = eliminatedCount + 1;

    chosen.status = 'ELIMINATED';
    chosen.eliminationOrder = eliminationOrder;
    chosen.eliminatedAt = new Date();
    await chosen.save({ session });

    const now = new Date();
    const intervalMs = spin.eliminationIntervalMs || getSpinIntervalMs();
    spin.nextEliminationAt = new Date(now.getTime() + intervalMs);
    await spin.save({ session });

    const eventCount = await SpinEvent.countDocuments({ spinId }).session(session);
    await SpinEvent.create(
      [
        {
          spinId: spin._id,
          roomId: spin.roomId,
          type: 'user_eliminated',
          payload: {
            userId: chosen.userId._id.toString(),
            displayName: chosen.userId.displayName,
            eliminationOrder,
            remainingCount: activeParticipants.length - 1,
          },
          sequence: eventCount,
        },
      ],
      { session }
    );

    const remainingActive = activeParticipants.filter(
      (p) => p.userId._id.toString() !== chosen.userId._id.toString()
    );

    return {
      isCompleted: false,
      nextTargetTime: spin.nextEliminationAt.getTime(),
      shouldRunNextImmediately: remainingActive.length === 1,
      eventPayloadToEmit: {
        type: 'user_eliminated',
        data: {
          spinId: spin._id.toString(),
          roomId: spin.roomId.toString(),
          eliminatedUserId: chosen.userId._id.toString(),
          eliminatedDisplayName: chosen.userId.displayName,
          eliminationOrder,
          remainingCount: remainingActive.length,
          remainingParticipants: remainingActive.map((p) => ({
            userId: p.userId._id.toString(),
            displayName: p.userId.displayName,
          })),
        },
      },
    };
  });

  if (result.isCompleted) {
    spinScheduler.cancel(spinId);
  }

  if (result.eventPayloadToEmit) {
    eventBus.emit(result.eventPayloadToEmit.type, result.eventPayloadToEmit.data);
  }

  if (result.shouldRunNextImmediately) {
    await executeEliminationTick(spinId);
  } else if (!result.isCompleted && result.nextTargetTime) {
    spinScheduler.schedule(spinId, result.nextTargetTime);
  }
}

// If the room owner leaves mid-spin, the spin elimination timer continues running uninterrupted on the server.
eventBus.on('user_left', async ({ roomId, userId }) => {
  try {
    const runningSpin = await Spin.findOne({ roomId, status: 'RUNNING' });
    if (!runningSpin) return;

    const participant = await SpinParticipant.findOne({
      spinId: runningSpin._id,
      userId,
      status: 'ACTIVE',
    });
    if (!participant) return;

    const eliminatedCount = await SpinParticipant.countDocuments({
      spinId: runningSpin._id,
      status: 'ELIMINATED',
    });
    const eliminationOrder = eliminatedCount + 1;

    participant.status = 'ELIMINATED';
    participant.eliminationOrder = eliminationOrder;
    participant.eliminatedAt = new Date();
    await participant.save();

    const remainingActive = (
      await SpinParticipant.find({
        spinId: runningSpin._id,
        status: 'ACTIVE',
      }).populate('userId', 'displayName')
    ).filter((p) => p.userId != null);

    eventBus.emit('user_eliminated', {
      spinId: runningSpin._id.toString(),
      roomId,
      eliminatedUserId: userId,
      eliminatedDisplayName: '',
      eliminationOrder,
      remainingCount: remainingActive.length,
      remainingParticipants: remainingActive.map((p) => ({
        userId: p.userId._id.toString(),
        displayName: p.userId.displayName,
      })),
    });

    if (remainingActive.length <= 1) {
      executeEliminationTick(runningSpin._id.toString()).catch(() => {});
    }
  } catch (err) {
    // Log error silently to preserve event loop
  }
});

export async function getSpinState(spinId) {
  const spin = await Spin.findById(spinId);
  if (!spin) {
    throw new AppError(ErrorCodes.SPIN_NOT_FOUND, 'Spin not found', 404);
  }

  const rawParticipants = await SpinParticipant.find({ spinId })
    .populate('userId', 'displayName')
    .sort({ createdAt: 1 });

  const participants = rawParticipants.filter((p) => p.userId != null);

  const eliminations = participants
    .filter((p) => p.status === 'ELIMINATED')
    .sort((a, b) => (a.eliminationOrder || 999) - (b.eliminationOrder || 999));

  return {
    id: spin._id.toString(),
    roomId: spin.roomId.toString(),
    status: spin.status,
    startedAt: spin.startedAt,
    completedAt: spin.completedAt,
    nextEliminationAt: spin.nextEliminationAt,
    eliminationIntervalMs: spin.eliminationIntervalMs,
    winnerId: spin.winnerId ? spin.winnerId.toString() : null,
    participantCount: participants.length,
    participants: participants.map((p) => ({
      userId: p.userId._id ? p.userId._id.toString() : p.userId.toString(),
      displayName: p.userId.displayName || '',
      status: p.status,
      eliminationOrder: p.eliminationOrder,
      eliminatedAt: p.eliminatedAt,
    })),
    eliminations: eliminations.map((e) => ({
      userId: e.userId._id ? e.userId._id.toString() : e.userId.toString(),
      displayName: e.userId.displayName || '',
      order: e.eliminationOrder,
      at: e.eliminatedAt,
    })),
  };
}

export async function getLiveSpinSnapshot(roomId) {
  const spin = await Spin.findOne({
    roomId,
    status: { $in: ['WAITING', 'RUNNING'] },
  });
  if (!spin) return null;
  return getSpinState(spin._id.toString());
}
