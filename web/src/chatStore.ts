import { useEffect, useState } from 'react';

type Listener = () => void;

class ChatStore {
  private listeners = new Set<Listener>();
  unread: Record<string, number> = {};

  setAll(counts: { conversationId: string; count: number }[]) {
    this.unread = Object.fromEntries(counts.map((c) => [c.conversationId, c.count]));
    this.notify();
  }

  increment(conversationId: string) {
    this.unread = { ...this.unread, [conversationId]: (this.unread[conversationId] || 0) + 1 };
    this.notify();
  }

  clear(conversationId: string) {
    if (!this.unread[conversationId]) return;
    const next = { ...this.unread };
    delete next[conversationId];
    this.unread = next;
    this.notify();
  }

  get total(): number {
    return Object.values(this.unread).reduce((sum, n) => sum + n, 0);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((l) => l()); }
}

export const chatStore = new ChatStore();

export function useUnread() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = chatStore.subscribe(() => force((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return { unread: chatStore.unread, total: chatStore.total, chatStore };
}
