import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { eventBus } from '../lib/eventBus.js';
import { presence } from './presence.js';
import { RoomMember } from '../models/RoomMember.js';
import { getRoomState } from '../modules/rooms/room.service.js';
import { getLiveSpinSnapshot } from '../modules/spins/spin.service.js';
import { SocketEvents } from './events.js';

let io = null;

export function initSocketGateway(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Handshake authentication and room membership verification with 5s timeout guard
  io.use((socket, next) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logger.warn({ socketId: socket.id }, 'Socket handshake authentication timed out after 5s');
        next(new Error('Authentication timed out'));
      }
    }, 5000);

    const safeNext = (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        next(err);
      }
    };

    (async () => {
      try {
        const auth = socket.handshake.auth || {};
        let token = auth.token;
        const roomId = auth.roomId;

        if (!token || !roomId) {
          return safeNext(new Error('Authentication token and roomId are required'));
        }

        if (typeof token === 'string' && token.startsWith('Bearer ')) {
          token = token.slice(7).trim();
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);
        const userId = decoded.sub;

        const member = await RoomMember.findOne({ roomId, userId, status: 'ACTIVE' });
        if (!member) {
          return safeNext(new Error('User is not an active member of the specified room'));
        }

        socket.data = { userId, roomId };
        safeNext();
      } catch (err) {
        logger.warn({ err: err.message }, 'Socket handshake authentication failed');
        safeNext(new Error('Unauthorized socket connection: ' + err.message));
      }
    })();
  });

  io.on('connection', async (socket) => {
    const { userId, roomId } = socket.data;

    socket.join(roomId);
    presence.addSocket(roomId, userId, socket.id);

    try {
      await RoomMember.updateOne({ roomId, userId }, { lastSeenAt: new Date() });

      const roomState = await getRoomState(roomId);
      const spinSnapshot = await getLiveSpinSnapshot(roomId);

      socket.emit(SocketEvents.ROOM_STATE, {
        room: roomState,
        spin: spinSnapshot,
      });
    } catch (err) {
      logger.error({ err, userId, roomId }, 'Error sending initial room state');
    }

    socket.on('disconnect', async () => {
      // Disconnecting a socket connection (closing tab/network drop) does not change RoomMember status to LEFT. Leaving a room is an explicit user action via HTTP API.
      presence.removeSocket(roomId, userId, socket.id);
      try {
        await RoomMember.updateOne({ roomId, userId }, { lastSeenAt: new Date() });
      } catch (err) {
        logger.error({ err, userId, roomId }, 'Error updating lastSeenAt on disconnect');
      }
    });
  });

  // Subscribe to domain event bus and broadcast to socket rooms
  const domainEvents = Object.values(SocketEvents).filter((e) => e !== SocketEvents.ROOM_STATE);
  for (const eventName of domainEvents) {
    eventBus.on(eventName, (payload) => {
      if (payload && payload.roomId && io) {
        io.to(payload.roomId).emit(eventName, payload);
      }
    });
  }

  logger.info('Socket.IO gateway initialized');
  return io;
}

export function getIO() {
  return io;
}
