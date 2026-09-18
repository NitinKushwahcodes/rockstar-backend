import { Spin } from '../../models/Spin.js';
import { logger } from '../../lib/logger.js';
import { executeEliminationTick } from './spin.service.js';

// TODO: timers are in-process; this service must run as a single instance until a Redis-backed scheduler replaces this.
class SpinScheduler {
  constructor() {
    this.timers = new Map();
  }

  // Chained setTimeout computes delay dynamically against the persisted nextEliminationAt target time rather than relying on fixed setInterval ticks, correcting for event-loop lag and database write latency.
  schedule(spinId, targetTimeMs = null) {
    this.cancel(spinId);

    const runTick = async () => {
      this.timers.delete(spinId);
      try {
        await executeEliminationTick(spinId);
      } catch (err) {
        logger.error({ err, spinId }, 'Error executing elimination tick');
      }
    };

    let delay = 0;
    if (targetTimeMs !== null) {
      delay = Math.max(0, targetTimeMs - Date.now());
    }

    const timer = setTimeout(runTick, delay);
    this.timers.set(spinId, timer);
  }

  cancel(spinId) {
    if (this.timers.has(spinId)) {
      clearTimeout(this.timers.get(spinId));
      this.timers.delete(spinId);
    }
  }

  async recoverUnfinishedSpins() {
    try {
      const runningSpins = await Spin.find({ status: 'RUNNING' });
      let recoveredCount = 0;

      for (const spin of runningSpins) {
        const nextTime = spin.nextEliminationAt ? new Date(spin.nextEliminationAt).getTime() : Date.now();
        this.schedule(spin._id.toString(), nextTime);
        recoveredCount++;
      }

      logger.info({ recoveredCount }, 'Recovered unfinished spins on server boot');
    } catch (err) {
      logger.error({ err }, 'Failed to recover unfinished spins');
    }
  }
}

export const spinScheduler = new SpinScheduler();
