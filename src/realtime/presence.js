// Presence tracking maps active socket IDs per user per room.
// A single user may open multiple tabs; they are only considered offline when their socket count drops to zero.
class PresenceManager {
  constructor() {
    this.roomSockets = new Map();
  }

  addSocket(roomId, userId, socketId) {
    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Map());
    }
    const userMap = this.roomSockets.get(roomId);
    if (!userMap.has(userId)) {
      userMap.set(userId, new Set());
    }
    userMap.get(userId).add(socketId);
  }

  removeSocket(roomId, userId, socketId) {
    if (!this.roomSockets.has(roomId)) return true;
    const userMap = this.roomSockets.get(roomId);
    if (!userMap.has(userId)) return true;

    const socketSet = userMap.get(userId);
    socketSet.delete(socketId);

    if (socketSet.size === 0) {
      userMap.delete(userId);
      if (userMap.size === 0) {
        this.roomSockets.delete(roomId);
      }
      return true; // No remaining active sockets for this user in this room
    }
    return false;
  }

  getUserSocketCount(roomId, userId) {
    const userMap = this.roomSockets.get(roomId);
    if (!userMap) return 0;
    const socketSet = userMap.get(userId);
    return socketSet ? socketSet.size : 0;
  }
}

export const presence = new PresenceManager();
