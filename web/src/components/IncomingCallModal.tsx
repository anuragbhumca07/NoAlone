import { useState } from 'react';
import { api } from '../api';
import type { IncomingCallPayload } from '../types';

export default function IncomingCallModal({
  payload,
  onClose,
}: {
  payload: IncomingCallPayload;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      let meetLink = payload.meetLink;
      // For real backend calls, hit accept; for mock calls (test mode), skip
      if (!payload.callId.startsWith('mock-')) {
        const res = await api.acceptCall(payload.callId);
        meetLink = res.meetLink || meetLink;
      }
      if (meetLink) window.open(meetLink, '_blank', 'noopener');
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to accept');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      if (!payload.callId.startsWith('mock-')) {
        await api.declineCall(payload.callId);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" data-testid="incoming-call-modal">
      <div className="modal">
        <div className="avatar lg" style={{ margin: '0 auto 12px' }}>
          {(payload.callerName || '?').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{payload.callerName}</div>
        <div style={{ color: 'var(--text-dim)', marginTop: 4, fontSize: 14 }}>
          <span className="ringing-dot" />
          Incoming {payload.callType.toLowerCase()} call
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
          via Google Meet
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
          <button className="danger" onClick={decline} disabled={busy} data-testid="decline-call">
            Decline
          </button>
          <button className="success" onClick={accept} disabled={busy} data-testid="accept-call">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
