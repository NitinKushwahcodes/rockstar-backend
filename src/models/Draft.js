import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    durationMs: { type: Number, required: true },
    effect: {
      type: String,
      enum: ['NONE', 'ECHO', 'REVERB', 'PITCH_SHIFT'],
      default: 'NONE',
    },
    fileUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export const Draft = mongoose.model('Draft', draftSchema);
