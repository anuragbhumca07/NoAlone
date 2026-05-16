import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectChatSocket, disconnectSockets } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export function useChatSocket() {
  const { token } = useAuthStore();
  const { addMessage, setTyping, updateConversationLastMessage } = useChatStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on('message:new', (message) => {
      addMessage(message);
      updateConversationLastMessage(message);
    });

    socket.on('message:typing', ({ conversationId, userId }) => {
      setTyping(conversationId, userId, true);
      setTimeout(() => setTyping(conversationId, userId, false), 3000);
    });

    return () => {
      socket.off('message:new');
      socket.off('message:typing');
    };
  }, [token]);

  return socketRef.current;
}
