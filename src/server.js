import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './lib/logger.js';
import { initSocketGateway } from './realtime/gateway.js';
import { spinScheduler } from './modules/spins/spin.scheduler.js';

await connectDB();
await spinScheduler.recoverUnfinishedSpins();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

initSocketGateway(server);

async function shutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database disconnection');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { server };
