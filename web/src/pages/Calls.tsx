import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Call, User } from '../types';

function relTime(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function Calls() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Call[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);

  const refresh = async () => {
    try {
      const [h, s] = await Promise.all([
        api.callHistory(),
        api.getCallAuthStatus().catch(() => ({ isAuthorized: false })),
      ]);
      setHistory(h as any);
      setAuthorized(s.isAuthorized);
    } catch (e: any) {
      setErr(e?.message || 'Could not load calls');
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const u = await api.searchUsers(search.trim());
        setResults(u as any);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const startAuthorize = () => {
    const mock = import.meta.env.VITE_MOCK_CALLS === 'true';
    if (mock) { setAuthorized(true); return; }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Set VITE_GOOGLE_CLIENT_ID in web/.env to use Google Meet calls');
      return;
    }
    const redirectUri = `${location.origin}/oauth/google`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&prompt=consent&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=calls`;
    location.href = url;
  };

  const callUser = async (user: User, type: 'VOICE' | 'VIDEO') => {
    const mock = import.meta.env.VITE_MOCK_CALLS === 'true';
    try {
      if (!mock) {
        const call = await api.initiateCall(user.id, type);
        if (call?.meetLink) window.open(call.meetLink, '_blank', 'noopener');
        refresh();
        return;
      }
      const meetLink = `https://meet.google.com/mock-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
      const mockCall: Call = {
        id: `mock-${Date.now()}`,
        callerId: 'me',
        receiverId: user.id,
        meetLink,
        status: 'RINGING',
        callType: type,
        createdAt: new Date().toISOString(),
        direction: 'outgoing',
        otherUser: user,
      };
      setHistory((prev) => [mockCall, ...prev]);
      window.open(meetLink, '_blank', 'noopener');
    } catch (e: any) {
      alert(e?.message || 'Call failed');
    }
  };

  return (
    <div data-testid="calls-page">
      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Calls</h2>
        {authorized === false && (
          <button onClick={startAuthorize} data-testid="authorize-google-calls">
            Authorize Google for Meet
          </button>
        )}
        {authorized && (
          <span className="chip online" data-testid="auth-status-ok">
            ● Google Calendar authorized
          </span>
        )}
      </div>

      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Voice and video calls happen over Google Meet — generated on demand via your authorized Google Calendar account.
        The link opens in a new tab; the conversation continues here.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <label>Start a new call</label>
        <input
          type="search"
          placeholder="Search for someone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="call-search"
        />
        {results.map((u) => (
          <div key={u.id} className="list-item" style={{ marginTop: 12 }} data-testid={`call-user-${u.id}`}>
            <div className="avatar">{u.displayName?.slice(0, 1).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{u.displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>@{u.username}</div>
            </div>
            <button className="ghost" onClick={() => callUser(u, 'VOICE')} data-testid={`call-${u.id}-voice`}>🎙</button>
            <button onClick={() => callUser(u, 'VIDEO')} data-testid={`call-${u.id}-video`}>🎥</button>
          </div>
        ))}
      </div>

      <h3>History</h3>
      {err && <div className="err">{err}</div>}
      {history.length === 0 && <div className="empty" data-testid="no-history">No calls yet.</div>}

      <div data-testid="call-history">
        {history.map((c) => (
          <div key={c.id} className="history-row" data-testid={`history-${c.id}`}>
            <div className="avatar">
              {(c.otherUser?.displayName || c.callerId).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>
                {c.otherUser?.displayName || (c.direction === 'incoming' ? 'Caller' : 'Receiver')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {c.direction === 'incoming' ? '⇣ Incoming' : '⇡ Outgoing'} · {c.callType.toLowerCase()} ·{' '}
                <span className={`status-${c.status}`}>{c.status.toLowerCase()}</span>
              </div>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              {c.durationSeconds ? `${c.durationSeconds}s` : ''}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{relTime(c.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
