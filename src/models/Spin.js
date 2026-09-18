import mongoose from 'mongoose';
import { env } from '../config/env.js';

const spinSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    startedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['WAITING', 'RUNNING', 'COMPLETED', 'ABORTED'],
      default: 'WAITING',
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nextEliminationAt: { type: Date, default: null },
    eliminationIntervalMs: {
      type: Number,
      default: () => Number(process.env.SPIN_INTERVAL_MS || env.SPIN_INTERVAL_MS || 5000),
    },
  },
  { timestamps: true }
);

export const Spin = mongoose.model('Spin', spinSchema);
