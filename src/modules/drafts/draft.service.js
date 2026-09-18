import { Draft } from '../../models/Draft.js';

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
