import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'https://noalone-api-production.up.railway.app';

let current: Socket | null = null;

export function getSocket(token: string | null): Socket | null {
  if (!token) {
    if (current) { current.disconnect(); current = null; }
    return null;
  }
  if (current && current.connected) return current;
  if (current) current.disconnect();

  current = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  return current;
}

export function closeSocket() {
  if (current) { current.disconnect(); current = null; }
}
