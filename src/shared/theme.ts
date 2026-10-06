export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'el_turpial_theme';
export function parseTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}
export function readThemePreference(): Theme | null {
  try { return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return null; }
}
export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101522' : '#faf8ff');
}
export function initializeTheme() { applyTheme(readThemePreference() || systemTheme()); }
