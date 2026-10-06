import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { applyTheme, parseTheme, readThemePreference, systemTheme, THEME_STORAGE_KEY, type Theme } from '../shared/theme';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(readThemePreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = preference || system;
  const previous = useRef(theme);
  useLayoutEffect(() => {
    const changed = previous.current !== theme;
    if (changed && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) document.documentElement.dataset.themeChanging = 'true';
    applyTheme(theme); previous.current = theme;
    const timer = changed ? window.setTimeout(() => { delete document.documentElement.dataset.themeChanging; }, 360) : undefined;
    return () => { window.clearTimeout(timer); delete document.documentElement.dataset.themeChanging; };
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const change = () => setSystem(media?.matches ? 'dark' : 'light');
    media?.addEventListener('change', change);
    const storage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key === THEME_STORAGE_KEY || event.key === null) { setPreference(parseTheme(event.newValue)); change(); }
    };
    window.addEventListener('storage', storage);
    return () => { media?.removeEventListener('change', change); window.removeEventListener('storage', storage); };
  }, []);
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the choice for this session if storage is unavailable. */ }
    setPreference(next);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider no encontrado');
  return context;
}
