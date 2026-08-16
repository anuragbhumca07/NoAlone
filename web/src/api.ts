const API_URL =
  import.meta.env.VITE_API_URL || 'https://noalone-api-production.up.railway.app/api/v1';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  return localStorage.getItem('noalone_token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/${path.replace(/^\//, '')}`, { ...opts, headers });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message, body);
  }
  return body as T;
}

export const api = {
  // ── Auth ──
  registerEmail: (email: string, password: string) =>
    request<{ message: string }>('auth/email/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ token: string; user: any; isNew: boolean }>('auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  loginEmail: (email: string, password: string) =>
    request<{ token: string; user: any; isNew: boolean }>('auth/email/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleSignIn: (accessToken: string) =>
    request<{ token: string; user: any; isNew: boolean }>('auth/google-mobile', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  // Exchanges a Supabase session for a noAlone backend session.
  supabaseSync: (accessToken: string) =>
    request<{ token: string; user: any; isNew: boolean }>('auth/supabase-sync', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  // Test helper — only used by the verify page if running E2E
  testGetCode: (email: string, testKey: string) =>
    request<{ code: string | null }>('auth/test/verification-code', {
      method: 'POST',
      body: JSON.stringify({ email, testKey }),
    }),

  // Self-service recovery: get your own pending verification code by
  // proving you know the password you registered with.
  recoverEmailCode: (email: string, password: string) =>
    request<{ code: string }>('auth/email/recover-code', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // ── Users ──
  getMe: () => request<any>('users/me'),
  updateMe: (patch: any) =>
    request<any>('users/me', { method: 'PATCH', body: JSON.stringify(patch) }),
  searchUsers: (q: string) => request<any[]>(`users/search?q=${encodeURIComponent(q)}`),
  getOnlineUsers: () => request<any[]>('users/online'),
  getUser: (id: string) => request<any>(`users/${id}`),

  // ── Chat ──
  listConversations: () => request<any[]>('chat/conversations'),
  startConversation: (targetUserId: string) =>
    request<any>('chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  getMessages: (conversationId: string) =>
    request<any[]>(`chat/conversations/${conversationId}/messages`),
  getUnread: () => request<{ conversationId: string; count: number }[]>('chat/unread'),

  // ── Calls ──
  getCallAuthStatus: () => request<{ isAuthorized: boolean }>('calls/authorize-status'),
  authorizeCalls: (code: string, redirectUri: string) =>
    request<{ success: boolean }>('calls/authorize', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    }),
  initiateCall: (receiverId: string, callType: 'VOICE' | 'VIDEO') =>
    request<{ call: { id: string; [k: string]: any }; meetLink: string }>('calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ receiverId, callType }),
    }),
  acceptCall: (callId: string) =>
    request<{ meetLink: string }>(`calls/${callId}/accept`, { method: 'POST' }),
  declineCall: (callId: string) =>
    request<{ success: boolean }>(`calls/${callId}/decline`, { method: 'POST' }),
  cancelCall: (callId: string) =>
    request<{ success: boolean }>(`calls/${callId}/cancel`, { method: 'POST' }),
  endCall: (callId: string) =>
    request<{ success: boolean }>(`calls/${callId}/end`, { method: 'POST' }),
  callHistory: () => request<any[]>('calls/history'),

  // ── Moderation ──
  reportUser: (reportedUserId: string, reason: string, description?: string) =>
    request<any>('moderation/report', {
      method: 'POST',
      body: JSON.stringify({ reportedUserId, reason, description }),
    }),
  blockUser: (blockedUserId: string) =>
    request<any>('moderation/block', { method: 'POST', body: JSON.stringify({ blockedUserId }) }),
  unblockUser: (userId: string) =>
    request<{ success: boolean }>(`moderation/block/${userId}`, { method: 'DELETE' }),
  getBlockedUsers: () => request<any[]>('moderation/blocked'),

  // ── Random matching ──
  matchHistory: () => request<any[]>('matching/history'),

  // ── AI companion ──
  getAiCompanion: () => request<any>('ai-companion/me'),
  updateAiCompanion: (patch: { name?: string; gender?: string; outfit?: object }) =>
    request<any>('ai-companion/me', { method: 'PUT', body: JSON.stringify(patch) }),
  getAiMessages: () => request<any[]>('ai-companion/messages'),
  sendAiMessage: (content: string) =>
    request<{ userMessage: any; aiMessage: any }>('ai-companion/messages', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  clearAiMessages: () => request<{ success: boolean }>('ai-companion/messages', { method: 'DELETE' }),
};

export { API_URL };
