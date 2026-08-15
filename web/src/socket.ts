import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'https://noalone-api-production.up.railway.app';

let current: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string | null): Socket | null {
  if (!token) {
    if (current) { current.disconnect(); current = null; currentToken = null; }
    return null;
  }
  // Reuse the existing socket for this token unconditionally. socket.io's
  // `.connected`/`.disconnected` flags both read as "not connected" during
  // the initial handshake (disconnected defaults true until the *first*
  // successful connect), so checking either one here recreates the socket
  // out from under whichever component (AppShell, Conversation) already
  // attached listeners to it — orphaning those listeners on a discarded
  // instance and silently dropping every event. Only recreate when the
  // token actually changes; socket.io's own `reconnection: true` handles
  // transient drops on the instance we keep.
  if (current && currentToken === token) return current;
  if (current) current.disconnect();

  currentToken = token;
  current = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  return current;
}

export function closeSocket() {
  if (current) { current.disconnect(); current = null; currentToken = null; }
  closeMatchingSocket();
}

// Separate namespace/connection for the random-match ("meet someone new")
// gateway — kept independent from the chat socket above so leaving the
// matching page can drop it without touching the chat connection.
let matching: Socket | null = null;
let matchingToken: string | null = null;

export function getMatchingSocket(token: string | null): Socket | null {
  if (!token) {
    if (matching) { matching.disconnect(); matching = null; matchingToken = null; }
    return null;
  }
  if (matching && matchingToken === token) return matching;
  if (matching) matching.disconnect();

  matchingToken = token;
  matching = io(`${SOCKET_URL}/matching`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  return matching;
}

export function closeMatchingSocket() {
  if (matching) { matching.disconnect(); matching = null; matchingToken = null; }
}
