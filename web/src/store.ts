import { useEffect, useState } from 'react';
import type { User } from './types';

const TOKEN_KEY = 'noalone_token';
const USER_KEY = 'noalone_user';

type Listener = () => void;

class AuthStore {
  private listeners = new Set<Listener>();
  token: string | null = null;
  user: User | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    this.user = raw ? JSON.parse(raw) : null;
  }

  setSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.notify();
  }

  setUser(user: User) {
    this.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.notify();
  }

  clear() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.notify();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((l) => l()); }
}

export const auth = new AuthStore();

export function useAuth() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = auth.subscribe(() => force((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return { token: auth.token, user: auth.user, auth };
}
