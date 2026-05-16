import { create } from 'zustand';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  mediaUrl?: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isOnline: boolean;
  };
  lastMessage?: Message;
  unreadCount?: number;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  typingUsers: Record<string, boolean>;
  setConversations: (convs: Conversation[]) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  updateConversationLastMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setMessages: (conversationId, messages) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: messages } })),

  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.conversationId] || [];
      const alreadyExists = existing.some((m) => m.id === message.id);
      if (alreadyExists) return state;
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...existing, message],
        },
      };
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [`${conversationId}:${userId}`]: isTyping },
    })),

  updateConversationLastMessage: (message) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === message.conversationId ? { ...conv, lastMessage: message } : conv,
      ),
    })),
}));
