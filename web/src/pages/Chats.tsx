import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useUnread } from '../chatStore';
import type { Conversation, User } from '../types';

export default function Chats() {
  const navigate = useNavigate();
  const { unread } = useUnread();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await api.listConversations();
      setConvs(list as any);
    } catch (e: any) {
      setErr(e?.message || 'Could not load chats');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const users = await api.searchUsers(search.trim());
        setResults(users as any);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openChatWith = async (userId: string) => {
    setBusy(true);
    try {
      const conv = await api.startConversation(userId);
      navigate(`/chats/${conv.id}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not open conversation');
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="chats-page">
      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Chats</h2>
      </div>

      <input
        type="search"
        placeholder="Search for someone by username or name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="user-search"
        style={{ maxWidth: 480 }}
      />

      {err && <div className="err" data-testid="chats-error">{err}</div>}

      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 8 }}>People</div>
          {results.map((u) => (
            <div
              key={u.id}
              className="list-item"
              data-testid={`user-result-${u.id}`}
              onClick={() => openChatWith(u.id)}
            >
              <div className="avatar">{u.displayName?.slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>@{u.username}</div>
              </div>
              {u.isOnline ? <span className="chip online">● online</span> : <span className="chip">offline</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 8 }}>Your conversations</div>

        {convs.length === 0 && (
          <div className="empty" data-testid="no-conversations">
            No conversations yet. Search for someone above to start chatting.
          </div>
        )}

        {convs.map((c) => {
          const count = unread[c.id] || 0;
          return (
            <div
              key={c.id}
              className="list-item"
              data-testid={`conversation-${c.id}`}
              onClick={() => navigate(`/chats/${c.id}`)}
            >
              <div className="avatar">{c.otherUser?.displayName?.slice(0, 1).toUpperCase() || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: count > 0 ? 700 : 600 }}>{c.otherUser?.displayName || 'Unknown'}</div>
                <div
                  style={{
                    fontSize: 13, color: count > 0 ? 'var(--text)' : 'var(--text-dim)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {c.lastMessage?.content || 'Say hello.'}
                </div>
              </div>
              {count > 0 && <span className="badge" data-testid={`unread-${c.id}`}>{count > 99 ? '99+' : count}</span>}
              {c.otherUser?.isOnline ? <span className="chip online">● online</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
