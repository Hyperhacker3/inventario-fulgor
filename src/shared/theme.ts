export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'el_turpial_theme';
export type UIStyle = 'glass' | 'neumorphism';
export const UI_STYLE_STORAGE_KEY = 'el_turpial_ui_style';
export const DEFAULT_UI_STYLE: UIStyle = 'neumorphism';
export const APPEARANCE_TRANSITION_MS = 3000;
export function parseUIStyle(value: string | null): UIStyle | null {
  return value === 'glass' || value === 'neumorphism' ? value : null;
}
export function readUIStylePreference(): UIStyle {
  try { return parseUIStyle(window.localStorage.getItem(UI_STYLE_STORAGE_KEY)) || DEFAULT_UI_STYLE; }
  catch { return DEFAULT_UI_STYLE; }
}
function updateBrowserColor() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const glass = document.documentElement.dataset.uiStyle === 'glass';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', glass ? (dark ? '#101b30' : '#edf2fc') : (dark ? '#202a3b' : '#e9edf3'));
}
export function applyUIStyle(style: UIStyle) {
  document.documentElement.dataset.uiStyle = style;
  updateBrowserColor();
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
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  updateBrowserColor();
}
export function initializeTheme() {
  applyUIStyle(readUIStylePreference());
  applyTheme(readThemePreference() || systemTheme());
}
