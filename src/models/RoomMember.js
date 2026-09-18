import mongoose from 'mongoose';

const roomMemberSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['ACTIVE', 'LEFT'], default: 'ACTIVE' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
roomMemberSchema.index({ roomId: 1, status: 1 });

export const RoomMember = mongoose.model('RoomMember', roomMemberSchema);
