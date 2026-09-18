import { io as ioClient } from 'socket.io-client';

export function connectTestSocket(baseUrl, token, roomId) {
  return ioClient(baseUrl, {
    auth: { token, roomId },
    transports: ['websocket'],
    reconnection: false,
  });
}

export function waitForEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs}ms) waiting for socket event '${eventName}'`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
