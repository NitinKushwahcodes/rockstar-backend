import { Draft } from '../../models/Draft.js';
import { RoomDraftShare } from '../../models/RoomDraftShare.js';
import { RoomMember } from '../../models/RoomMember.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { eventBus } from '../../lib/eventBus.js';
import { SocketEvents } from '../../realtime/events.js';

export async function createDraft(ownerId, data) {
  const draft = await Draft.create({
    ownerId,
    name: data.name,
    durationMs: data.durationMs,
    effect: data.effect,
    fileUrl: data.fileUrl,
  });

  return {
    id: draft._id.toString(),
    ownerId: draft.ownerId.toString(),
    name: draft.name,
    durationMs: draft.durationMs,
    effect: draft.effect,
    fileUrl: draft.fileUrl,
    createdAt: draft.createdAt,
  };
}

export async function shareDraftToRoom(roomId, draftId, userId) {
  const member = await RoomMember.findOne({ roomId, userId, status: 'ACTIVE' });
  if (!member) {
    throw new AppError(ErrorCodes.NOT_A_MEMBER, 'User is not an active member of this room', 409);
  }

  const draft = await Draft.findById(draftId);
  if (!draft) {
    throw new AppError(ErrorCodes.DRAFT_NOT_FOUND, 'Draft not found', 404);
  }

  try {
    await RoomDraftShare.create({
      roomId,
      draftId,
      sharedById: userId,
    });
  } catch (err) {
    if (err.code !== 11000) {
      throw err;
    }
  }

  const sharePayload = {
    id: draft._id.toString(),
    name: draft.name,
    durationMs: draft.durationMs,
    effect: draft.effect,
    fileUrl: draft.fileUrl,
    sharedById: userId.toString(),
  };

  eventBus.emit(SocketEvents.DRAFT_SHARED, {
    roomId: roomId.toString(),
    draft: sharePayload,
  });

  return sharePayload;
}
