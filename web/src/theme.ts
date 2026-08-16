import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'noalone_theme';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme());

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, toggle, setTheme };
}
