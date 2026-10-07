import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { UIStyleToggle } from '../../src/components/UIStyleToggle';
import { Select } from '../../src/components/ui/Select';
import { MobileMenu } from '../../src/components/navigation/MobileMenu';
import { THEME_STORAGE_KEY, UI_STYLE_STORAGE_KEY, initializeTheme, parseTheme, readUIStylePreference } from '../../src/shared/theme';

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

test('style defaults to neumorphism, changes independently of color and preserves live fields and a portaled selector', async () => {
  reset(); initializeTheme();
  assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const styleButton = () => host.querySelector<HTMLButtonElement>('.ui-style-toggle')!;
  try {
    await act(() => root.render(h(ThemeProvider, null, h('input', { defaultValue: 'Material' }), h(UIStyleToggle), h(ThemeToggle),
      h(Select, { value: 'A', onChange() {} }, h('option', { value: 'A' }, 'Almacén A'), h('option', { value: 'B' }, 'Almacén B')))));
    assert.match(styleButton().textContent!, /Cambiar a Liquid Glass/);
    const input = host.querySelector('input')!; input.value = 'Cantidad: 42'; input.focus();
    await act(() => styleButton().click());
    assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    assert.equal(window.localStorage.getItem(UI_STYLE_STORAGE_KEY), 'glass');
    assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), null);
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), '#edf2fc');
    assert.equal(host.querySelector('input'), input); assert.equal(input.value, 'Cantidad: 42'); assert.equal(document.activeElement, input);
    const trigger = host.querySelector<HTMLButtonElement>('.app-select-trigger')!;
    await act(() => trigger.click());
    const list = document.querySelector('.app-select-list')!;
    assert.ok(list.closest('.ui-presence')?.parentElement === document.body);
    await act(() => toggle().click());
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    assert.equal(document.querySelector('meta[name="theme-color"]')!.getAttribute('content'), '#101b30');
    await act(() => styleButton().click());
    assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'dark');
    assert.ok(document.querySelector('.app-select-list') === list);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(input.value, 'Cantidad: 42');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('style persists on remount, syncs other tabs and resets safely for invalid or cleared preferences', async () => {
  reset(true); window.localStorage.setItem(UI_STYLE_STORAGE_KEY, 'glass');
  const host = document.body.appendChild(document.createElement('div'));
  let root = createRoot(host);
  const storage = (value: string | null, key: string | null = UI_STYLE_STORAGE_KEY) => window.dispatchEvent(new dom.window.StorageEvent('storage', { key, newValue: value, storageArea: window.localStorage }));
  try {
    await act(() => root.render(h(ThemeProvider, null, h(UIStyleToggle))));
    assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    await act(() => root.unmount()); root = createRoot(host);
    await act(() => root.render(h(ThemeProvider, null, h(UIStyleToggle))));
    assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    await act(() => storage('invalid')); assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    await act(() => storage('glass')); assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    await act(() => storage(null, null)); assert.equal(document.documentElement.dataset.uiStyle, 'neumorphism');
    assert.equal(document.documentElement.dataset.theme, 'dark');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('both appearance changes retain a three-second transition and restart it for a quick second change', async () => {
  reset();
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ThemeProvider, null, h(UIStyleToggle), h(ThemeToggle))));
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
    await act(() => toggle().click());
    await act(() => new Promise(resolve => window.setTimeout(resolve, 500)));
    assert.equal(document.documentElement.dataset.themeChanging, 'true');
    await act(() => host.querySelector<HTMLButtonElement>('.ui-style-toggle')!.click());
    await act(() => new Promise(resolve => window.setTimeout(resolve, 2600)));
    assert.equal(document.documentElement.dataset.themeChanging, 'true');
    await act(() => new Promise(resolve => window.setTimeout(resolve, 500)));
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('style works with blocked storage and respects reduced motion', async () => {
  reset(); reduced = true;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const originalGet = dom.window.Storage.prototype.getItem, originalSet = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.getItem = dom.window.Storage.prototype.setItem = () => { throw new Error('Blocked storage'); };
  try {
    assert.equal(readUIStylePreference(), 'neumorphism');
    await act(() => root.render(h(ThemeProvider, null, h(UIStyleToggle))));
    await act(() => host.querySelector<HTMLButtonElement>('.ui-style-toggle')!.click());
    assert.equal(document.documentElement.dataset.uiStyle, 'glass');
    assert.equal(document.documentElement.dataset.themeChanging, undefined);
  } finally { dom.window.Storage.prototype.getItem = originalGet; dom.window.Storage.prototype.setItem = originalSet; await act(() => root.unmount()); host.remove(); }
});

test('initial HTML restores all four combinations and falls back when style storage is invalid or blocked', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const theme of ['light', 'dark']) for (const style of ['neumorphism', 'glass', 'invalid', 'blocked']) {
    const shell = new JSDOM(html, { url: 'https://app.test/', runScripts: 'dangerously', beforeParse(win) {
      Object.assign(win, { matchMedia: () => ({ matches: theme === 'dark' }) });
      if (style === 'blocked') win.Storage.prototype.getItem = () => { throw new Error('Blocked'); };
      else { win.localStorage.setItem(THEME_STORAGE_KEY, theme); win.localStorage.setItem(UI_STYLE_STORAGE_KEY, style); }
    } });
    assert.equal(shell.window.document.documentElement.dataset.theme, theme);
    assert.equal(shell.window.document.documentElement.dataset.uiStyle, style === 'glass' ? 'glass' : 'neumorphism');
    shell.window.close();
  }
});
