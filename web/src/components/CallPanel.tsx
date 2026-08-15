import { useEffect, useState } from 'react';
import { api } from '../api';
import { callStore, type ActiveCall } from '../callStore';

function useDuration(connectedAt?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!connectedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [connectedAt]);
  if (!connectedAt) return '0:00';
  const secs = Math.max(0, Math.floor((now - connectedAt) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallPanel({ call }: { call: ActiveCall }) {
  const [busy, setBusy] = useState(false);
  const duration = useDuration(call.connectedAt);

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

  const phaseLabel =
    call.phase === 'ringing-in' ? `Incoming ${call.callType.toLowerCase()} call`
    : call.phase === 'ringing-out' ? 'Calling…'
    : `${call.callType === 'VIDEO' ? '🎥' : '🎙'} Call in progress`;

  return (
    <div className="modal-backdrop" data-testid="call-panel">
      <div className="modal">
        <div className="avatar lg" style={{ margin: '0 auto 12px' }}>
          {(call.otherName || '?').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{call.otherName}</div>
        <div style={{ color: 'var(--text-dim)', marginTop: 4, fontSize: 14 }}>
          {call.phase !== 'connected' && <span className="ringing-dot" />}
          {phaseLabel}
        </div>

        {call.phase === 'connected' ? (
          <>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} data-testid="call-duration">
              {duration}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)' }}>
              Meet is open in another tab
            </div>
            {call.callType === 'VOICE' && (
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                Voice call — turn your camera off in Meet if you don't want to be seen.
              </div>
            )}
            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              <button className="ghost" onClick={() => callStore.focusMeet()} data-testid="call-reopen-meet">
                ↗ Reopen Meet
              </button>
              <button className="danger" onClick={endCall} disabled={busy} data-testid="call-end">
                End call
              </button>
            </div>
          </>
        ) : call.phase === 'ringing-in' ? (
          <>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>via Google Meet</div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              <button className="danger" onClick={decline} disabled={busy} data-testid="decline-call">
                Decline
              </button>
              <button className="success" onClick={accept} disabled={busy} data-testid="accept-call">
                Accept
              </button>
            </div>
          </>
        ) : (
          <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
            <button className="danger" onClick={cancel} disabled={busy} data-testid="cancel-call">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
