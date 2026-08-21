import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { getMatchingSocket } from '../socket';

type GenderPref = 'ANY' | 'MALE' | 'FEMALE';

type Phase = 'idle' | 'searching' | 'timeout' | 'error';

export default function RandomChat() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [genderPref, setGenderPref] = useState<GenderPref>('ANY');
  const [poolCount, setPoolCount] = useState<number | null>(null);
  const startedAt = useRef<number>(0);

  const refreshPoolCount = () => api.matchPoolCount().then((r) => setPoolCount(r.count)).catch(() => {});

  useEffect(() => {
    refreshPoolCount();
    // Keep the "searching now" count fresh while this page is open — it's
    // the number that actually predicts whether Start will find someone,
    // unlike general online presence.
    const interval = setInterval(refreshPoolCount, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    const socket = getMatchingSocket(token);
    if (!socket) return;

    const onFound = (result: { conversationId: string; user: { id: string; displayName: string } }) => {
      setPhase('idle');
      navigate(`/chats/${result.conversationId}`);
    };
    const onTimeout = () => { setPhase('timeout'); refreshPoolCount(); };
    const onError = () => setPhase('error');

    socket.on('match:found', onFound);
    socket.on(`match:found:${user.id}`, onFound);
    socket.on('match:timeout', onTimeout);
    socket.on('match:error', onError);
    return () => {
      socket.off('match:found', onFound);
      socket.off(`match:found:${user.id}`, onFound);
      socket.off('match:timeout', onTimeout);
      socket.off('match:error', onError);
    };
  }, [token, user, navigate]);

  const start = () => {
    if (!token) return;
    const socket = getMatchingSocket(token);
    if (!socket) return;
    setPhase('searching');
    startedAt.current = Date.now();
    socket.emit('match:search', { genderPreference: genderPref, language: user?.language });
  };

  const cancel = () => {
    if (!token) return;
    const socket = getMatchingSocket(token);
    socket?.emit('match:cancel');
    setPhase('idle');
    refreshPoolCount();
  };

  // Once I click Start, I'm part of the pool too — the "before you start"
  // count and "how many others" are one apart, worth being precise about.
  const othersSearching = phase === 'searching' ? Math.max(0, (poolCount ?? 1) - 1) : poolCount;

  return (
    <div data-testid="random-chat-page">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Meet someone new</h2>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Get matched instantly with another noAlone member who's <em>also</em> hitting Start right now.
        Chat, then start a voice or video call from the conversation — same as any other chat.
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        <div
          className={`chip ${(othersSearching ?? 0) > 0 ? 'online' : ''}`}
          style={{ marginBottom: 16 }}
          data-testid="random-online-count"
        >
          ● {othersSearching ?? '…'} {othersSearching === 1 ? 'person' : 'people'} searching right now
        </div>

        {phase === 'idle' || phase === 'timeout' || phase === 'error' ? (
          <>
            <label>Match with</label>
            <div className="row" style={{ gap: 8, marginBottom: 16 }}>
              {(['ANY', 'FEMALE', 'MALE'] as GenderPref[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={genderPref === g ? '' : 'ghost'}
                  onClick={() => setGenderPref(g)}
                  data-testid={`gender-pref-${g}`}
                >
                  {g === 'ANY' ? 'Anyone' : g.charAt(0) + g.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {phase === 'timeout' && (
              <div className="ai-nudge" data-testid="random-timeout">
                <span style={{ fontSize: 28 }}>🤖</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Nobody else was searching at the same time</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    This matches you with someone else who's also searching <em>right now</em> — it's
                    not that no one's around, just no one hit Start in the last minute. Chat with your
                    AI buddy while you wait, or try again.
                  </div>
                </div>
                <button onClick={() => navigate('/ai-buddy')} data-testid="random-chat-ai-cta">
                  Chat with AI
                </button>
              </div>
            )}
            {phase === 'error' && (
              <div className="err" data-testid="random-error" style={{ marginBottom: 12 }}>
                Couldn't start matching. Please try again.
              </div>
            )}

            <button onClick={start} data-testid="random-start">
              🎲 Start matching
            </button>
          </>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <span className="ringing-dot" />
              <span data-testid="random-searching">Looking for someone to talk to…</span>
            </div>
            <button className="ghost" onClick={cancel} data-testid="random-cancel">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
