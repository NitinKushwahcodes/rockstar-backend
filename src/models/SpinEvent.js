import mongoose from 'mongoose';

const spinEventSchema = new mongoose.Schema(
  {
    spinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spin', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    type: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    sequence: { type: Number, required: true },
  },
  { timestamps: true }
);

spinEventSchema.index({ spinId: 1, sequence: 1 }, { unique: true });

export const SpinEvent = mongoose.model('SpinEvent', spinEventSchema);
