import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { auth, useAuth } from '../store';
import { getSocket, closeSocket } from '../socket';
import { api } from '../api';
import { supabase } from '../supabaseClient';
import { chatStore, useUnread } from '../chatStore';
import { callStore, useActiveCall } from '../callStore';
import { startRingtone, playMessagePing } from '../sounds';
import StatusToggle from './StatusToggle';
import CallPanel from './CallPanel';
import ThemeToggle from './ThemeToggle';
import ThemeScenery from './ThemeScenery';
import UserAvatar from './UserAvatar';
import type { IncomingCallPayload, Message } from '../types';

export default function AppShell() {
  const { token, user } = useAuth();
  const { total: unreadTotal } = useUnread();
  const { call } = useActiveCall();
  const navigate = useNavigate();
  const location = useLocation();
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile nav drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const onIncoming = (payload: IncomingCallPayload) => {
      callStore.receiveIncoming({
        callId: payload.callId,
        otherName: payload.callerName,
        otherAvatar: payload.callerAvatar,
        callType: payload.callType,
        meetLink: payload.meetLink,
      });
    };
    const onAccepted = (data: { callId: string; meetLink: string }) => {
      if (callStore.current?.callId === data.callId) callStore.markConnected(data.meetLink);
    };
    const onDeclined = (data: { callId: string }) => {
      if (callStore.current?.callId === data.callId) callStore.clear();
    };
    const onCancelled = (data: { callId: string }) => {
      if (callStore.current?.callId === data.callId) callStore.clear();
    };
    const onMissed = (data: { callId: string }) => {
      if (callStore.current?.callId === data.callId) callStore.clear();
    };
    const onEnded = (data: { callId: string }) => {
      if (callStore.current?.callId === data.callId) callStore.clear();
    };
    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:declined', onDeclined);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:missed', onMissed);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:missed', onMissed);
      socket.off('call:ended', onEnded);
    };
  }, [token]);

  // Ring while a call is incoming (real or mock); the caller's outgoing side
  // gets its own quieter ringback tone once connected/declined it just stops.
  useEffect(() => {
    if (call?.phase === 'ringing-in') {
      stopRingtoneRef.current = startRingtone();
    } else {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
    }
    return () => { stopRingtoneRef.current?.(); stopRingtoneRef.current = null; };
  }, [call?.phase]);

  // Listen for mock incoming-call events fired by the dev-mode initiator
  useEffect(() => {
    const onMock = (e: Event) => {
      const detail = (e as CustomEvent<IncomingCallPayload>).detail;
      callStore.receiveIncoming({
        callId: detail.callId,
        otherName: detail.callerName,
        otherAvatar: detail.callerAvatar,
        callType: detail.callType,
        meetLink: detail.meetLink,
      });
    };
    window.addEventListener('noalone:mock-incoming-call' as any, onMock);
    return () => window.removeEventListener('noalone:mock-incoming-call' as any, onMock);
  }, []);

  // Unread badge: seed from the server, then keep live via the socket. Any
  // new message not sent by me bumps its conversation's count and pings —
  // Conversation.tsx clears the count itself for whichever thread is open.
  useEffect(() => {
    if (!user) return;
    api.getUnread().then((counts) => chatStore.setAll(counts)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token);
    if (!socket) return;

    const onNew = (msg: Message) => {
      if (msg.senderId === user.id) return;
      socket.emit('message:delivered', { messageId: msg.id });
      if (msg.conversationId) chatStore.increment(msg.conversationId);
      playMessagePing();
    };
    socket.on('message:new', onNew);
    return () => { socket.off('message:new', onNew); };
  }, [token, user]);

  const handleLogout = () => {
    closeSocket();
    supabase.auth.signOut().catch(() => {});
    auth.clear();
    navigate('/login');
  };

  return (
    <>
      <ThemeScenery />
      <div className="layout">
      <div className="mobile-topbar">
        <button
          className="ghost mobile-nav-toggle"
          onClick={() => setMobileNavOpen((v) => !v)}
          data-testid="mobile-nav-toggle"
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="brand">noAlone</div>
      </div>

      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          data-testid="mobile-nav-backdrop"
        />
      )}

      <aside className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}`} data-testid="sidebar">
        <div className="spread" style={{ marginBottom: 8 }}>
          <div className="brand">noAlone</div>
          <ThemeToggle />
        </div>

        <NavLink to="/chats" data-testid="nav-chats">
          💬 Chats
          {unreadTotal > 0 && (
            <span className="badge" data-testid="unread-badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
          )}
        </NavLink>
        <NavLink to="/calls" data-testid="nav-calls">📞 Calls</NavLink>
        <NavLink to="/rooms" data-testid="nav-rooms">🏛️ Rooms</NavLink>
        <NavLink to="/random" data-testid="nav-random">🎲 Meet someone</NavLink>
        <NavLink to="/ai-buddy" data-testid="nav-ai-buddy">🤖 AI Buddy</NavLink>
        <NavLink to="/profile" data-testid="nav-profile">👤 Profile</NavLink>

        <div style={{ flex: 1 }} />

        <StatusToggle />

        <div className="row" style={{ marginTop: 12, padding: '0 4px' }}>
          <UserAvatar name={user?.displayName} avatarConfig={user?.avatarConfig} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.displayName || 'You'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>@{user?.username || ''}</div>
          </div>
        </div>

        <button className="ghost" onClick={handleLogout} data-testid="sign-out">
          Sign out
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {call && <CallPanel call={call} />}
      </div>
    </>
  );
}
