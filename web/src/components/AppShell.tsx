import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, useAuth } from '../store';
import { getSocket, closeSocket } from '../socket';
import { api } from '../api';
import { supabase } from '../supabaseClient';
import StatusToggle from './StatusToggle';
import IncomingCallModal from './IncomingCallModal';
import type { IncomingCallPayload } from '../types';

export default function AppShell() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const onIncoming = (payload: IncomingCallPayload) => setIncomingCall(payload);
    const onCancelled = () => setIncomingCall(null);
    socket.on('call:incoming', onIncoming);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:ended', onCancelled);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:ended', onCancelled);
    };
  }, [token]);

  // Listen for mock incoming-call events fired by the dev-mode initiator
  useEffect(() => {
    const onMock = (e: Event) => {
      const detail = (e as CustomEvent<IncomingCallPayload>).detail;
      setIncomingCall(detail);
    };
    window.addEventListener('noalone:mock-incoming-call' as any, onMock);
    return () => window.removeEventListener('noalone:mock-incoming-call' as any, onMock);
  }, []);

  const handleLogout = () => {
    closeSocket();
    supabase.auth.signOut().catch(() => {});
    auth.clear();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar" data-testid="sidebar">
        <div className="brand">noAlone</div>

        <NavLink to="/chats" data-testid="nav-chats">💬 Chats</NavLink>
        <NavLink to="/calls" data-testid="nav-calls">📞 Calls</NavLink>
        <NavLink to="/profile" data-testid="nav-profile">👤 Profile</NavLink>

        <div style={{ flex: 1 }} />

        <StatusToggle />

        <div className="row" style={{ marginTop: 12, padding: '0 4px' }}>
          <div className="avatar">{(user?.displayName || '?').slice(0, 1).toUpperCase()}</div>
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

      {incomingCall && (
        <IncomingCallModal
          payload={incomingCall}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}
