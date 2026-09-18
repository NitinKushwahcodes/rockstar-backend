import mongoose from 'mongoose';

const spinParticipantSchema = new mongoose.Schema(
  {
    spinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spin', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'ELIMINATED', 'WINNER', 'LEFT'],
      default: 'ACTIVE',
    },
    eliminationOrder: { type: Number },
    eliminatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

spinParticipantSchema.index({ spinId: 1, userId: 1 }, { unique: true });
spinParticipantSchema.index(
  { spinId: 1, eliminationOrder: 1 },
  { unique: true, partialFilterExpression: { eliminationOrder: { $type: 'number' } } }
);
spinParticipantSchema.index({ spinId: 1, status: 1 });

export const SpinParticipant = mongoose.model('SpinParticipant', spinParticipantSchema);
