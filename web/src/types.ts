export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  language?: string;
  interests?: string[];
  isOnline?: boolean;
  isVerified?: boolean;
  lastSeen?: string;
  avatarConfig?: import('./avatar').AvatarConfig | null;
}

export interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUser?: User;
  lastMessage?: Message | null;
  unreadCount?: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  roomId?: string;
  senderId: string;
  content?: string | null;
  mediaUrl?: string | null;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  isRead: boolean;
  deliveredAt?: string | null;
  createdAt: string;
  sender?: { id: string; displayName: string; avatarUrl?: string | null };
}

export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ACCEPTED' | 'DECLINED' | 'MISSED' | 'ENDED';

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  meetLink?: string | null;
  meetCode?: string | null;
  status: CallStatus;
  callType: CallType;
  createdAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  direction?: 'incoming' | 'outgoing';
  otherUser?: User;
  durationSeconds?: number | null;
}

export interface IncomingCallPayload {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callType: CallType;
  meetLink: string;
}
