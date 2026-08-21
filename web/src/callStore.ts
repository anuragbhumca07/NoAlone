import { useEffect, useState } from 'react';

export type CallPhase = 'ringing-out' | 'ringing-in' | 'connected';

export interface ActiveCall {
  callId: string;
  direction: 'incoming' | 'outgoing';
  otherName: string;
  otherAvatar?: string | null;
  callType: 'VOICE' | 'VIDEO';
  meetLink?: string;
  phase: CallPhase;
  connectedAt?: number;
  ringingSince?: number;
}

type Listener = () => void;

class CallStore {
  private listeners = new Set<Listener>();
  current: ActiveCall | null = null;
  /** Reference to the window.open()'d Meet tab, so we can re-focus it. */
  meetWindow: Window | null = null;
  /** Set when the browser blocked the popup, so the UI can offer a manual "Open Meet" fallback. */
  meetBlocked = false;

  startOutgoing(call: Omit<ActiveCall, 'phase' | 'direction'>) {
    this.current = { ...call, direction: 'outgoing', phase: 'ringing-out', ringingSince: Date.now() };
    this.notify();
  }

  receiveIncoming(call: Omit<ActiveCall, 'phase' | 'direction'>) {
    this.current = { ...call, direction: 'incoming', phase: 'ringing-in', ringingSince: Date.now() };
    this.notify();
  }

  markConnected(meetLink?: string) {
    if (!this.current) return;
    const link = meetLink || this.current.meetLink;
    this.current = { ...this.current, phase: 'connected', connectedAt: Date.now(), meetLink: link };
    if (link) this.openMeet(link);
    this.notify();
  }

  openMeet(link: string) {
    if (this.meetWindow && !this.meetWindow.closed) {
      this.meetWindow.focus();
      return;
    }
    this.meetWindow = window.open(link, '_blank', 'noopener');
    this.meetBlocked = !this.meetWindow;
    this.notify();
  }

  focusMeet() {
    if (this.current?.meetLink) this.openMeet(this.current.meetLink);
  }

  clear() {
    this.current = null;
    this.meetWindow = null;
    this.meetBlocked = false;
    this.notify();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((l) => l()); }
}

export const callStore = new CallStore();

export function useActiveCall() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = callStore.subscribe(() => force((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return { call: callStore.current, callStore };
}
