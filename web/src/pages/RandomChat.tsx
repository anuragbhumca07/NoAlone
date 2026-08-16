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
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    api.getOnlineUsers().then((list) => setOnlineCount(list.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    const socket = getMatchingSocket(token);
    if (!socket) return;

    const onFound = (result: { conversationId: string; user: { id: string; displayName: string } }) => {
      setPhase('idle');
      navigate(`/chats/${result.conversationId}`);
    };
    const onTimeout = () => setPhase('timeout');
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
  };

  return (
    <div data-testid="random-chat-page">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Meet someone new</h2>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Get matched instantly with another noAlone member. Chat, then start a voice or video call from
        the conversation — same as any other chat.
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        {onlineCount !== null && (
          <div className="chip online" style={{ marginBottom: 16 }} data-testid="random-online-count">
            ● {onlineCount} online now
          </div>
        )}

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
                  <div style={{ fontWeight: 600 }}>No one's free right now</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    Chat with your AI buddy while you wait, or try matching again in a bit.
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
