import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);
