import { Router } from 'express';
import mongoose from 'mongoose';
import userRouter from './modules/users/user.routes.js';
import roomRouter from './modules/rooms/room.routes.js';
import draftRouter from './modules/drafts/draft.routes.js';

const router = Router();

router.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/readyz', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      return res.status(200).json({ status: 'ready', db: 'up' });
    }
    return res.status(503).json({ status: 'not_ready', db: 'down' });
  } catch {
    return res.status(503).json({ status: 'not_ready', db: 'down' });
  }
});

router.use('/api/v1/users', userRouter);
router.use('/api/v1/rooms', roomRouter);
router.use('/api/v1/drafts', draftRouter);

export default router;
