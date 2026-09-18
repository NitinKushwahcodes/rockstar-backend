import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from '../../src/config/env.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore fallback DNS errors
}

// Override spin interval for fast automated test runs (~50ms ticks)
env.SPIN_INTERVAL_MS = 50;
process.env.SPIN_INTERVAL_MS = '50';

function getTestMongoUri() {
  const baseUri = process.env.MONGODB_URI_TEST || env.MONGODB_URI;
  if (baseUri.includes('_test')) return baseUri;
  return baseUri.replace(/\/(roxstar|admin)?(\?|$)/, '/roxstar_test$2');
}

const testMongoUri = getTestMongoUri();

if (!testMongoUri.toLowerCase().includes('test')) {
  console.error('SECURITY GUARD: MONGODB_URI must target a _test database for automated testing!');
  process.exit(1);
}

import { Spin } from '../../src/models/Spin.js';
import { SpinParticipant } from '../../src/models/SpinParticipant.js';

export async function setupTestDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testMongoUri);
    try {
      await Spin.collection.createIndex(
        { roomId: 1 },
        { unique: true, partialFilterExpression: { status: { $in: ['WAITING', 'RUNNING'] } } }
      );
      await SpinParticipant.syncIndexes();
    } catch {
      // Ignore index sync errors in test setup if already created
    }
  }
}

export async function clearTestDb() {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
}

export async function teardownTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await clearTestDb();
    await mongoose.connection.close();
  }
}
