import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { MobileMenu } from '../../src/components/navigation/MobileMenu';
import { THEME_STORAGE_KEY, initializeTheme, parseTheme } from '../../src/shared/theme';

const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color"></head><body></body></html>', { url: 'https://app.test/' });
let dark = false, reduced = false;
const changes = new Set<() => void>();
Object.assign(dom.window, { matchMedia: (query: string) => ({ get matches() { return query.includes('color-scheme') ? dark : reduced; },
  addEventListener: (_event: string, listener: () => void) => { if (query.includes('color-scheme')) changes.add(listener); },
  removeEventListener: (_event: string, listener: () => void) => changes.delete(listener) }) });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
function reset(systemDark = false) { dark = systemDark; reduced = false; window.localStorage.clear(); delete document.documentElement.dataset.themeChanging; }
const toggle = () => document.querySelector<HTMLButtonElement>('.theme-toggle')!;
const systemChange = async (value: boolean) => { dark = value; await act(() => changes.forEach(listener => listener())); };

test('system theme applies initially and follows the device until an explicit choice is stored, preserving live forms', async () => {
  reset(true); initializeTheme(); assert.equal(document.documentElement.dataset.theme, 'dark');
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const render = () => h(ThemeProvider, null, h('input', { defaultValue: 'Cantidad pendiente' }), h(ThemeToggle));
  try {
    await act(() => root.render(render()));
    assert.equal(toggle().getAttribute('aria-label'), 'Cambiar a modo claro');
    assert.equal(toggle().querySelector('.theme-toggle-icon')!.getAttribute('data-theme'), 'dark');
    await systemChange(false); assert.equal(document.documentElement.dataset.theme, 'light');
    const input = host.querySelector('input')!; input.value = '42'; input.focus();
    await act(() => toggle().click());
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(document.documentElement.dataset.themeChanging, 'true');
    assert.equal(document.documentElement.style.colorScheme, 'dark');
    assert.equal(document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), '#101522');
    assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'dark');
    assert.equal(host.querySelector('input'), input); assert.equal(input.value, '42'); assert.equal(document.activeElement, input);
    await systemChange(true); await systemChange(false); assert.equal(document.documentElement.dataset.theme, 'dark');
    await act(() => toggle().click()); assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'light');
    assert.equal(toggle().getAttribute('aria-label'), 'Cambiar a modo oscuro');
    assert.equal(changes.size, 1);
  } finally { await act(() => root.unmount()); host.remove(); }
  assert.equal(changes.size, 0);
});

test('saved choice survives mounting again, synchronizes other tabs and returns to the device when cleared', async () => {
  reset(true); window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
  const host = document.body.appendChild(document.createElement('div'));
  let root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.theme, 'light');
    await act(() => toggle().click()); await act(() => root.unmount());
    dark = false; root = createRoot(host);
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.theme, 'dark');
    const storage = (value: string | null) => window.dispatchEvent(new dom.window.StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: value, storageArea: window.localStorage }));
    await act(() => storage('light')); assert.equal(document.documentElement.dataset.theme, 'light');
    await act(() => storage(null)); assert.equal(document.documentElement.dataset.theme, 'light');
    await systemChange(true); assert.equal(document.documentElement.dataset.theme, 'dark');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('theme toggling works when saving is blocked and reduced motion disables the page effect', async () => {
  reset(); reduced = true;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const original = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  try {
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    await act(() => toggle().click());
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
    assert.equal(parseTheme('invalid'), null);
  } finally { dom.window.Storage.prototype.setItem = original; await act(() => root.unmount()); host.remove(); }
});

test('mobile menu places its theme action with help and logout, and keeps focused search when toggling', async () => {
  reset();
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h(MobileMenu, { open: true, onClose() {}, items: [], activeView: 'dashboard',
      onNavigate() {}, search: 'CAB', onSearch() {}, onHelp() {}, onSignOut() {}, themeAction: h(ThemeToggle, { menu: true }) }))));
    const menu = document.querySelector('[role="dialog"]')!;
    const button = menu.querySelector<HTMLButtonElement>('.theme-toggle')!;
    assert.match(button.parentElement!.parentElement!.textContent!, /Modo oscuro.*Ayuda.*Cerrar sesión/);
    const input = menu.querySelector<HTMLInputElement>('input')!; input.focus();
    await act(() => button.click());
    assert.equal(document.activeElement, input); assert.equal(input.value, 'CAB');
    assert.match(button.textContent!, /Modo claro/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('initial HTML applies system or saved theme before loading the application code', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const [systemDark, saved, expected] of [[true, null, 'dark'], [false, null, 'light'], [true, 'light', 'light'], [false, 'dark', 'dark'], [true, 'invalid', 'dark']] as const) {
    const shell = new JSDOM(html, { url: 'https://app.test/', runScripts: 'dangerously', beforeParse(win) {
      Object.assign(win, { matchMedia: () => ({ matches: systemDark }) });
      if (saved) win.localStorage.setItem(THEME_STORAGE_KEY, saved);
    } });
    assert.equal(shell.window.document.documentElement.dataset.theme, expected);
    assert.equal(shell.window.document.documentElement.style.colorScheme, expected);
    shell.window.close();
  }
});
