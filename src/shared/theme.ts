export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'el_turpial_theme';
export const APPEARANCE_TRANSITION_MS = 1500;
function updateBrowserColor() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', dark ? '#202a3b' : '#e9edf3');
}
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
  document.documentElement.dataset.uiStyle = 'neumorphism';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  updateBrowserColor();
}
export function initializeTheme() {
  try { window.localStorage.removeItem('el_turpial_ui_style'); } catch { /* The retired preference cannot affect the fixed material. */ }
  applyTheme(readThemePreference() || systemTheme());
}
