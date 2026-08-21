import { useEffect, useState } from 'react';
import { api } from '../api';
import { callStore, type ActiveCall } from '../callStore';

function useElapsed(since?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  if (!since) return '0:00';
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallPanel({ call }: { call: ActiveCall }) {
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);
  const duration = useElapsed(call.connectedAt);
  const ringingElapsed = useElapsed(call.ringingSince);

  // Re-render if the Meet popup gets blocked after the fact (e.g. a delayed
  // accept()), since callStore.meetBlocked isn't itself observed elsewhere.
  useEffect(() => {
    const unsub = callStore.subscribe(() => forceTick((n) => n + 1));
    return () => { unsub(); };
  }, []);

  const accept = async () => {
    setBusy(true);
    try {
      let meetLink = call.meetLink;
      if (!call.callId.startsWith('mock-')) {
        const res = await api.acceptCall(call.callId);
        meetLink = res.meetLink || meetLink;
      }
      callStore.markConnected(meetLink);
    } catch (e: any) {
      alert(e?.message || 'Failed to accept');
      callStore.clear();
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      if (!call.callId.startsWith('mock-')) await api.declineCall(call.callId);
    } finally {
      setBusy(false);
      callStore.clear();
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      if (!call.callId.startsWith('mock-')) await api.cancelCall(call.callId);
    } finally {
      setBusy(false);
      callStore.clear();
    }
  };

  const endCall = async () => {
    setBusy(true);
    try {
      if (!call.callId.startsWith('mock-')) await api.endCall(call.callId);
    } finally {
      setBusy(false);
      callStore.clear();
    }
  };

  const phaseIcon = call.phase === 'connected' ? (call.callType === 'VIDEO' ? '🎥' : '🎙') : call.callType === 'VIDEO' ? '🎥' : '📞';
  const phaseLabel =
    call.phase === 'ringing-in' ? `Incoming ${call.callType.toLowerCase()} call`
    : call.phase === 'ringing-out' ? `Calling ${call.otherName}…`
    : `Call in progress`;

  return (
    <div className="modal-backdrop" data-testid="call-panel">
      <div className="modal call-modal">
        <div className={`avatar xl call-avatar${call.phase !== 'connected' ? ' call-avatar-pulse' : ''}`} style={{ margin: '0 auto 14px' }}>
          {(call.otherName || '?').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{call.otherName}</div>
        <div className="row" style={{ justifyContent: 'center', color: 'var(--text-dim)', marginTop: 6, fontSize: 14 }}>
          <span style={{ fontSize: 16 }}>{phaseIcon}</span>
          {call.phase !== 'connected' && <span className="ringing-dot" />}
          {phaseLabel}
        </div>

        {call.phase === 'connected' ? (
          <>
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} data-testid="call-duration">
              {duration}
            </div>

            <div className="call-meet-status" data-testid="call-meet-status">
              {callStore.meetBlocked ? (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--warn)' }}>⚠️ Your browser blocked the Meet popup</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    Click below to open it manually — this call is still active.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600 }}>🎥 Google Meet is open in another tab</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    Switch tabs to see & hear {call.otherName}. Come back here anytime — this panel
                    tracks your call and lets you hang up.
                  </div>
                </>
              )}
            </div>

            {call.callType === 'VOICE' && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                💡 Voice call — turn your camera off in Meet if you don't want to be seen.
              </div>
            )}

            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              {call.meetLink && (
                <a
                  href={call.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ghost"
                  onClick={() => callStore.focusMeet()}
                  data-testid="call-reopen-meet"
                >
                  ↗ {callStore.meetBlocked ? 'Open Meet' : 'Reopen Meet'}
                </a>
              )}
              <button className="danger" onClick={endCall} disabled={busy} data-testid="call-end">
                End call
              </button>
            </div>
          </>
        ) : call.phase === 'ringing-in' ? (
          <>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
              🎥 Accepting opens Google Meet in a new tab, where you'll actually talk.
            </div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              <button className="danger" onClick={decline} disabled={busy} data-testid="decline-call">
                Decline
              </button>
              <button className="success" onClick={accept} disabled={busy} data-testid="accept-call">
                {busy ? 'Accepting…' : 'Accept'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }} data-testid="call-ringing-elapsed">
              Ringing for {ringingElapsed}
            </div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              <button className="danger" onClick={cancel} disabled={busy} data-testid="cancel-call">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
