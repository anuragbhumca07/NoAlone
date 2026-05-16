import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../constants';

let chatSocket: Socket | null = null;
let matchingSocket: Socket | null = null;

export const connectChatSocket = (token: string): Socket => {
  if (chatSocket?.connected) return chatSocket;

  chatSocket = io(`${WS_URL}/chat`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return chatSocket;
};

export const connectMatchingSocket = (token: string): Socket => {
  if (matchingSocket?.connected) return matchingSocket;

  matchingSocket = io(`${WS_URL}/matching`, {
    auth: { token },
    transports: ['websocket'],
  });

  return matchingSocket;
};

export const getChatSocket = (): Socket | null => chatSocket;
export const getMatchingSocket = (): Socket | null => matchingSocket;

export const disconnectSockets = () => {
  chatSocket?.disconnect();
  matchingSocket?.disconnect();
  chatSocket = null;
  matchingSocket = null;
};
