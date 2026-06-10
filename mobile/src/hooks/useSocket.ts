import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectChatSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';

export function useChatSocket() {
  const { token } = useAuthStore();
  const { addMessage, setTyping, updateConversationLastMessage } = useChatStore();
  const { setIncomingCall, setOutgoingCall, clearCalls } = useCallStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    // ── Chat events ──────────────────────────────────────────
    socket.on('message:new', (message) => {
      addMessage(message);
      updateConversationLastMessage(message);
    });

    socket.on('message:typing', ({ conversationId, userId }) => {
      setTyping(conversationId, userId, true);
      setTimeout(() => setTyping(conversationId, userId, false), 3000);
    });

    // ── Call events ──────────────────────────────────────────
    socket.on('call:incoming', (data) => {
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType,
        meetLink: data.meetLink,
      });
    });

    socket.on('call:accepted', (data) => {
      // Outgoing call was accepted — open the meet link
      // The OutgoingCallScreen listens for this via the store
      setOutgoingCall((prev: any) =>
        prev ? { ...prev, meetLink: data.meetLink, status: 'accepted' } : prev,
      );
    });

    socket.on('call:declined', () => {
      clearCalls();
    });

    socket.on('call:cancelled', () => {
      setIncomingCall(null);
    });

    socket.on('call:missed', () => {
      clearCalls();
    });

    socket.on('call:ended', () => {
      clearCalls();
    });

    return () => {
      socket.off('message:new');
      socket.off('message:typing');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:declined');
      socket.off('call:cancelled');
      socket.off('call:missed');
      socket.off('call:ended');
    };
  }, [token]);

  return socketRef.current;
}
