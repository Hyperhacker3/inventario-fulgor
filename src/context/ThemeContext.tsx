import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { applyTheme, applyUIStyle, DEFAULT_UI_STYLE, parseTheme, parseUIStyle, readThemePreference, readUIStylePreference, systemTheme, THEME_STORAGE_KEY, UI_STYLE_STORAGE_KEY, type Theme, type UIStyle } from '../shared/theme';
import { transitionAppearance } from '../shared/appearanceTransition';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; uiStyle: UIStyle; toggleUIStyle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(readThemePreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const [uiStyle, setUIStyle] = useState<UIStyle>(readUIStylePreference);
  const theme = preference || system;
  const previous = useRef({ theme, uiStyle });
  useLayoutEffect(() => {
    const themeChanged = previous.current.theme !== theme;
    const changed = themeChanged || previous.current.uiStyle !== uiStyle;
    previous.current = { theme, uiStyle };
    const apply = () => { applyUIStyle(uiStyle); applyTheme(theme); };
    if (changed) return transitionAppearance(apply, themeChanged);
    apply();
  }, [theme, uiStyle]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const change = () => setSystem(media?.matches ? 'dark' : 'light');
    media?.addEventListener('change', change);
    const storage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key === THEME_STORAGE_KEY || event.key === null) { setPreference(parseTheme(event.newValue)); change(); }
      if (event.key === UI_STYLE_STORAGE_KEY || event.key === null) setUIStyle(parseUIStyle(event.newValue) || DEFAULT_UI_STYLE);
    };
    window.addEventListener('storage', storage);
    return () => { media?.removeEventListener('change', change); window.removeEventListener('storage', storage); };
  }, []);
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the choice for this session if storage is unavailable. */ }
    setPreference(next);
  }, [theme]);
  const toggleUIStyle = useCallback(() => {
    const next = uiStyle === 'neumorphism' ? 'glass' : 'neumorphism';
    try { window.localStorage.setItem(UI_STYLE_STORAGE_KEY, next); } catch { /* Keep the choice for this session if storage is unavailable. */ }
    setUIStyle(next);
  }, [uiStyle]);
  return <ThemeContext.Provider value={{ theme, toggleTheme, uiStyle, toggleUIStyle }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider no encontrado');
  return context;
}
