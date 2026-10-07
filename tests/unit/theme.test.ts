import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { ThemeToggle } from '../../src/components/ThemeToggle';

import { Select } from '../../src/components/ui/Select';
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
    assert.equal(document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), '#202a3b');
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
    assert.equal(shell.window.document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(shell.window.document.documentElement.style.colorScheme, expected);
    shell.window.close();
  }
});

test('retired glass preferences become neumorphism, preserving palette, live fields and an open selector', async () => {
  reset(); window.localStorage.setItem('el_turpial_ui_style', 'glass'); initializeTheme();
  assert.equal(window.localStorage.getItem('el_turpial_ui_style'), null);
  assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h('input', { defaultValue: 'Material' }), h(ThemeToggle),
      h(Select, { value: 'A', onChange() {} }, h('option', { value: 'A' }, 'Almacén A'), h('option', { value: 'B' }, 'Almacén B')))));
    const input = host.querySelector('input')!; input.value = 'Cantidad: 42'; input.focus();
    const trigger = host.querySelector<HTMLButtonElement>('.app-select-trigger')!;
    await act(() => trigger.click());
    const list = document.querySelector('.app-select-list')!;
    await act(() => toggle().click());
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), '#202a3b');
    assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'dark');
    assert.equal(host.querySelector('input'), input); assert.equal(input.value, 'Cantidad: 42');
    assert.equal(document.querySelector('.app-select-list'), list); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('legacy style storage events and remounts cannot restore glass or overwrite the saved palette', async () => {
  reset(true); window.localStorage.setItem(THEME_STORAGE_KEY, 'light'); window.localStorage.setItem('el_turpial_ui_style', 'glass');
  const host = document.body.appendChild(document.createElement('div')); let root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    const event = (key: string | null, value: string | null) => window.dispatchEvent(new dom.window.StorageEvent('storage', { key, newValue: value, storageArea: window.localStorage }));
    await act(() => event('el_turpial_ui_style', 'glass'));
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism'); assert.equal(document.documentElement.dataset.theme, 'light');
    await act(() => root.unmount()); root = createRoot(host);
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism'); assert.equal(document.documentElement.dataset.theme, 'light');
    await act(() => event(null, null)); assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('palette changes retain a 1.5-second fallback and restart it for a quick second change', async () => {
  reset();
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
    await act(() => toggle().click());
    await act(() => new Promise(resolve => window.setTimeout(resolve, 500)));
    assert.equal(document.documentElement.dataset.themeChanging, 'true');
    await act(() => toggle().click());
    await act(() => new Promise(resolve => window.setTimeout(resolve, 1100)));
    assert.equal(document.documentElement.dataset.themeChanging, 'true');
    await act(() => new Promise(resolve => window.setTimeout(resolve, 500)));
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
    assert.equal(document.documentElement.dataset.theme, 'light');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('fixed neumorphism and theme toggling work when reading, removing and saving storage are blocked', async () => {
  reset(true); reduced = true;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const originalGet = dom.window.Storage.prototype.getItem, originalSet = dom.window.Storage.prototype.setItem, originalRemove = dom.window.Storage.prototype.removeItem;
  dom.window.Storage.prototype.getItem = dom.window.Storage.prototype.setItem = dom.window.Storage.prototype.removeItem = () => { throw new Error('Blocked storage'); };
  try {
    initializeTheme(); assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    await act(() => root.render(h(ThemeProvider, null, h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.theme, 'dark');
    await act(() => toggle().click()); assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
  } finally {
    dom.window.Storage.prototype.getItem = originalGet; dom.window.Storage.prototype.setItem = originalSet; dom.window.Storage.prototype.removeItem = originalRemove;
    await act(() => root.unmount()); host.remove();
  }
});

test('a second palette choice cancels a pending snapshot and preserves the latest palette and form', async () => {
  reset();
  const callbacks: ViewTransitionUpdateCallback[] = [], finishes: (() => void)[] = []; let skips = 0;
  document.startViewTransition = callback => {
    callbacks.push(callback!);
    const finished = new Promise<void>(resolve => { finishes.push(resolve); });
    return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), finished, skipTransition() { skips++; } } as ViewTransition;
  };
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h('input', { defaultValue: 'Material' }), h(ThemeToggle))));
    const input = host.querySelector('input')!; input.value = '42'; input.focus();
    await act(() => toggle().click()); assert.equal(document.documentElement.dataset.themeSweeping, 'true');
    await act(() => toggle().click()); assert.equal(skips, 1); assert.equal(callbacks.length, 2);
    await act(async () => { await callbacks[1](); finishes[1](); });
    await act(async () => { await callbacks[0](); finishes[0](); });
    assert.equal(document.documentElement.dataset.theme, 'light'); assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(document.documentElement.dataset.themeSweeping, undefined);
    assert.equal(host.querySelector('input'), input); assert.equal(input.value, '42'); assert.equal(document.activeElement, input);
  } finally { await act(() => root.unmount()); host.remove(); delete (document as Partial<Document>).startViewTransition; }
});

test('initial HTML uses only neumorphism even with legacy preferences or unavailable storage', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const theme of ['light', 'dark']) for (const legacy of ['neumorphism', 'glass', 'invalid', 'blocked', 'remove-blocked']) {
    const shell = new JSDOM(html, { url: 'https://app.test/', runScripts: 'dangerously', beforeParse(win) {
      Object.assign(win, { matchMedia: () => ({ matches: theme === 'dark' }) });
      win.localStorage.setItem(THEME_STORAGE_KEY, theme); win.localStorage.setItem('el_turpial_ui_style', legacy);
      if (legacy === 'blocked') win.Storage.prototype.getItem = () => { throw new Error('Blocked'); };
      if (legacy === 'remove-blocked') win.Storage.prototype.removeItem = () => { throw new Error('Blocked'); };
    } });
    assert.equal(shell.window.document.documentElement.dataset.theme, theme);
    assert.equal(shell.window.document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(shell.window.document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), theme === 'dark' ? '#202a3b' : '#e9edf3');
    if (legacy !== 'remove-blocked' && legacy !== 'blocked') assert.equal(shell.window.localStorage.getItem('el_turpial_ui_style'), null);
    shell.window.close();
  }
  assert.doesNotMatch(html, /data-ui-style='glass'/);
});
