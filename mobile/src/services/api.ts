import axios from 'axios';
import { API_URL } from '../constants';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  },
);

export default api;

// Auth
export const authAPI = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => api.post('/auth/verify-otp', { phone, code }),
  guestLogin: () => api.post('/auth/guest-login'),
  updateFcmToken: (fcmToken: string) => api.patch('/auth/fcm-token', { fcmToken }),
};

// Users
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.patch('/users/me', data),
  getUser: (id: string) => api.get(`/users/${id}`),
  searchUsers: (q: string) => api.get(`/users/search?q=${q}`),
  getOnlineUsers: () => api.get('/users/online'),
};

// Chat
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getOrCreateConversation: (targetUserId: string) => api.post('/chat/conversations', { targetUserId }),
  getMessages: (conversationId: string, cursor?: string) =>
    api.get(`/chat/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  getUnread: () => api.get('/chat/unread'),
};

// Rooms
export const roomsAPI = {
  getRooms: (filters?: { language?: string; topic?: string; isLive?: boolean }) =>
    api.get('/rooms', { params: filters }),
  getRoom: (id: string) => api.get(`/rooms/${id}`),
  createRoom: (data: any) => api.post('/rooms', data),
  joinRoom: (id: string) => api.post(`/rooms/${id}/join`),
  leaveRoom: (id: string) => api.post(`/rooms/${id}/leave`),
  getRoomMessages: (id: string) => api.get(`/rooms/${id}/messages`),
  getMyRooms: () => api.get('/rooms/mine'),
  setLive: (id: string, isLive: boolean) => api.patch(`/rooms/${id}/live`, { isLive }),
};

// Matching
export const matchingAPI = {
  joinPool: (data?: any) => api.post('/matching/join', data || {}),
  leavePool: () => api.post('/matching/leave'),
  getHistory: () => api.get('/matching/history'),
};

// Moderation
export const moderationAPI = {
  reportUser: (data: any) => api.post('/moderation/report', data),
  blockUser: (blockedUserId: string) => api.post('/moderation/block', { blockedUserId }),
  unblockUser: (userId: string) => api.delete(`/moderation/block/${userId}`),
  getBlocked: () => api.get('/moderation/blocked'),
};
