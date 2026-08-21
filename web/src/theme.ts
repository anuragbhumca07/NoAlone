import { useEffect, useState } from 'react';

export type Theme = 'flower' | 'night' | 'sunset';
const STORAGE_KEY = 'noalone_theme';

function migrate(raw: string | null): Theme {
  if (raw === 'night' || raw === 'sunset' || raw === 'flower') return raw;
  if (raw === 'dark') return 'night'; // old binary toggle's dark mode
  return 'flower'; // old 'light' (or unset) — new default
}

function readStoredTheme(): Theme {
  try {
    return migrate(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'flower';
  }
}

function applyToDom(theme: Theme) {
  if (theme === 'flower') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

type Listener = () => void;

class ThemeStore {
  private listeners = new Set<Listener>();
  current: Theme = readStoredTheme();

  setTheme(theme: Theme) {
    this.current = theme;
    applyToDom(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    this.notify();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((l) => l()); }
}

export const themeStore = new ThemeStore();
// The pre-paint inline script in index.html already set the DOM attribute
// for night/sunset before React mounted — nothing to do for flower (no
// attribute = default), so no redundant applyToDom() call needed here.

export function useTheme() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = themeStore.subscribe(() => force((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return { theme: themeStore.current, setTheme: (t: Theme) => themeStore.setTheme(t) };
}
