import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { getSocket } from '../socket';
import type { Message } from '../types';

export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const list = await api.getMessages(id);
        // Merge: preserve any local-* optimistic messages that haven't yet
        // been mirrored back by the server.
        setMessages((prev) => {
          const serverIds = new Set((list as any[]).map((m) => m.id));
          const localOnly = prev.filter((m) => m.id.startsWith('local-') && !serverIds.has(m.id));
          return [...(list as any[]), ...localOnly];
        });
        // Derive the other user from a recent conversation entry
        const convs = await api.listConversations();
        const here = (convs as any[]).find((c) => c.id === id);
        if (here) setOtherUser(here.otherUser);
        try {
          const s = await api.getCallAuthStatus();
          setAuthorized(s.isAuthorized);
        } catch { setAuthorized(false); }
      } catch (e: any) {
        setErr(e?.message || 'Could not load conversation');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    const socket = getSocket(token);
    if (!socket) return;
    const onNew = (msg: Message) => {
      if (msg.conversationId === id) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    socket.on('message:new', onNew);
    return () => { socket.off('message:new', onNew); };
  }, [token, id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !id) return;
    const content = text.trim();
    setText('');
    // Optimistic add — render immediately regardless of socket state
    setMessages((prev) => [...prev, {
      id: `local-${Date.now()}`,
      conversationId: id,
      senderId: user?.id || '',
      content,
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    }]);
    const socket = token ? getSocket(token) : null;
    if (socket && otherUser) {
      socket.emit('message:send', {
        conversationId: id,
        targetUserId: otherUser.id,
        content,
        type: 'TEXT',
      });
    }
  };

  const startCall = async (callType: 'VOICE' | 'VIDEO') => {
    if (!otherUser) return;
    const mock = import.meta.env.VITE_MOCK_CALLS === 'true';
    if (mock && (!authorized)) {
      // Mock authorization in test/demo mode
      setAuthorized(true);
    }
    try {
      if (!mock) {
        const call = await api.initiateCall(otherUser.id, callType);
        if (call?.meetLink) window.open(call.meetLink, '_blank', 'noopener');
        return;
      }
      // Mock path — fabricate a Meet link and open it
      const callId = `mock-${Date.now()}`;
      const meetLink = `https://meet.google.com/mock-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
      window.dispatchEvent(new CustomEvent('noalone:mock-incoming-call', {
        detail: {
          callId,
          callerId: user?.id,
          callerName: user?.displayName || 'You',
          callerAvatar: null,
          callType,
          meetLink,
        },
      }));
    } catch (e: any) {
      alert(e?.message || 'Call failed');
    }
  };

  const startAuthorize = () => {
    const mock = import.meta.env.VITE_MOCK_CALLS === 'true';
    if (mock) { setAuthorized(true); return; }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Google sign-in not configured. Set VITE_GOOGLE_CLIENT_ID in web/.env');
      return;
    }
    const redirectUri = `${location.origin}/oauth/google`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&prompt=consent&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=calls`;
    location.href = url;
  };

  return (
    <div className="thread" data-testid="conversation-page">
      <div className="thread-header">
        <div className="row">
          <button className="ghost" onClick={() => navigate('/chats')} data-testid="back-to-chats">←</button>
          <div className="avatar">{otherUser?.displayName?.slice(0, 1).toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{otherUser?.displayName || 'Conversation'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              @{otherUser?.username || ''} {otherUser?.isOnline ? '• online' : ''}
            </div>
          </div>
        </div>
        <div className="row">
          {authorized === false && (
            <button className="ghost" onClick={startAuthorize} data-testid="authorize-calls">
              Authorize Google
            </button>
          )}
          <button onClick={() => startCall('VOICE')} disabled={!otherUser} data-testid="start-voice-call">
            🎙 Voice call
          </button>
          <button onClick={() => startCall('VIDEO')} disabled={!otherUser} data-testid="start-video-call">
            🎥 Video call
          </button>
        </div>
      </div>

      <div className="messages" ref={scrollRef} data-testid="messages">
        {err && <div className="err">{err}</div>}
        {messages.length === 0 && <div className="empty">No messages yet. Say hello.</div>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === user?.id ? 'mine' : ''}`}
            data-testid="message"
          >
            {m.content}
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          data-testid="composer-input"
        />
        <button type="submit" disabled={!text.trim()} data-testid="composer-send">Send</button>
      </form>
    </div>
  );
}
