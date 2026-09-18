import mongoose from 'mongoose';

const roomDraftShareSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft', required: true },
    sharedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

roomDraftShareSchema.index({ roomId: 1, draftId: 1 }, { unique: true });

export const RoomDraftShare = mongoose.model('RoomDraftShare', roomDraftShareSchema);
