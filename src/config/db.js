import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';
import { logger } from '../lib/logger.js';
import { Spin } from '../models/Spin.js';
import { SpinParticipant } from '../models/SpinParticipant.js';

// Set public DNS servers for c-ares SRV resolution on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if unable to set custom DNS servers
}

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB Atlas');

    // Partial unique index guarantees at the database level that a room can have at most one active spin at any given time, preventing race conditions under concurrent requests.
    await Spin.collection.createIndex(
      { roomId: 1 },
      { unique: true, partialFilterExpression: { status: { $in: ['WAITING', 'RUNNING'] } } }
    );
    logger.info('Partial unique index on Spin collection verified');

    try {
      await SpinParticipant.collection.dropIndex('spinId_1_eliminationOrder_1');
    } catch {
      // Index might not exist or already dropped
    }
    await SpinParticipant.syncIndexes();
    logger.info('Indexes for SpinParticipant synchronized');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    process.exit(1);
  }
}
