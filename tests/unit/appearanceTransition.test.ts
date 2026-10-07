import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { transitionAppearance } from '../../src/shared/appearanceTransition';
import { APPEARANCE_TRANSITION_MS, applyTheme, initializeTheme } from '../../src/shared/theme';

const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color"></head><body><input value="Borrador"></body></html>', { url: 'https://app.test/' });
let reduced = false;
Object.assign(dom.window, { matchMedia: () => ({ matches: reduced }) });
Object.assign(globalThis, { window: dom.window, document: dom.window.document });
const root = document.documentElement;
function reset() {
  reduced = false;
  delete root.dataset.themeChanging; delete root.dataset.themeSweeping;
  delete (document as Partial<Document>).startViewTransition;
  initializeTheme();
}
function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function capture() {
  const ready = deferred(), updated = deferred(), finished = deferred();
  let callback!: () => void | Promise<void>, skips = 0;
  const start = (update?: ViewTransitionUpdateCallback) => {
    callback = update!;
    return { ready: ready.promise, updateCallbackDone: updated.promise, finished: finished.promise, skipTransition: () => { skips++; } } as ViewTransition;
  };
  return { start, ready, updated, finished, update: () => { callback(); updated.resolve(); ready.resolve(); }, skips: () => skips };
}

test('native sweep captures the old palette, then applies the new one without copying live fields', async () => {
  reset(); const view = capture(); document.startViewTransition = view.start;
  const input = document.querySelector('input')!; input.value = '42'; input.focus();
  const cleanup = transitionAppearance(() => applyTheme('dark'));
  try {
    assert.equal(root.dataset.theme, 'light');
    assert.equal(root.dataset.themeSweeping, 'true');
    assert.equal(root.dataset.themeChanging, undefined);
    view.update();
    assert.equal(root.dataset.theme, 'dark');
    assert.ok(document.querySelector('input') === input); assert.equal(input.value, '42');
    assert.ok(document.activeElement === input);
    view.finished.resolve(); await view.finished.promise; await Promise.resolve();
    assert.equal(root.dataset.themeSweeping, undefined);
  } finally { cleanup(); }
});

test('interrupting a sweep prevents its late callback and completion from overwriting the latest choice', async () => {
  reset(); const old = capture(); document.startViewTransition = old.start;
  const stopOld = transitionAppearance(() => applyTheme('dark'));
  stopOld(); assert.equal(old.skips(), 1);
  const current = capture(); document.startViewTransition = current.start;
  const stopCurrent = transitionAppearance(() => applyTheme('light'));
  try {
    current.update(); old.update();
    assert.equal(root.dataset.theme, 'light');
    old.finished.resolve(); await old.finished.promise; await Promise.resolve();
    assert.equal(root.dataset.themeSweeping, 'true');
    current.finished.resolve(); await current.finished.promise; await Promise.resolve();
    assert.equal(root.dataset.themeSweeping, undefined);
  } finally { stopCurrent(); }
});

test('unsupported or unavailable native capture falls back, and reduced motion always applies immediately', () => {
  reset(); let updates = 0;
  let cleanup = transitionAppearance(() => updates++);
  assert.equal(updates, 1); assert.equal(root.dataset.themeChanging, 'true'); cleanup();
  document.startViewTransition = () => { throw new Error('Capture unavailable'); };
  cleanup = transitionAppearance(() => updates++);
  assert.equal(updates, 2); assert.equal(root.dataset.themeSweeping, undefined); assert.equal(root.dataset.themeChanging, 'true'); cleanup();
  reduced = true;
  cleanup = transitionAppearance(() => updates++);
  assert.equal(updates, 3); assert.equal(root.dataset.themeChanging, undefined); assert.equal(root.dataset.themeSweeping, undefined); cleanup();
});

test('a skipped browser snapshot still applies the palette and cleans up without an unhandled rejection', async () => {
  reset(); const view = capture(); document.startViewTransition = view.start;
  const cleanup = transitionAppearance(() => applyTheme('dark'));
  try {
    view.ready.reject(new Error('Document hidden'));
    view.update(); view.finished.resolve();
    await view.finished.promise; await Promise.resolve();
    assert.equal(root.dataset.theme, 'dark'); assert.equal(root.dataset.themeSweeping, undefined);
  } finally { cleanup(); }
});

test('the palette fallback retains a 1.5-second fade when native capture is unavailable', () => {
  reset();
  const cleanup = transitionAppearance(() => applyTheme('dark'));
  try {
    assert.equal(root.dataset.theme, 'dark'); assert.equal(root.dataset.uiStyle, 'neumorphism');
    assert.equal(root.dataset.themeChanging, 'true'); assert.equal(root.dataset.themeSweeping, undefined);
    const css = fs.readFileSync(new URL('../../src/theme.css', import.meta.url), 'utf8');
    assert.equal(APPEARANCE_TRANSITION_MS, 1500); assert.match(css, /--theme-duration:\s*1500ms/);
  } finally { cleanup(); }
});

test('neumorphic border rules cover neutral, status, dashed and portaled surfaces without touching print or symbols', () => {
  reset();
  const css = fs.readFileSync(new URL('../../src/appearance.css', import.meta.url), 'utf8');
  const borderRule = css.match(/(:root\[data-ui-style='neumorphism'\] \*:not[\s\S]+?)\{\s*border-color: transparent !important;[\s\S]*?\}/)![0];
  const selector = borderRule.slice(0, borderRule.indexOf('{')).split(',\n')[0].trim();
  const fixture = document.createElement('div');
  fixture.innerHTML = '<section class="border rounded-xl"></section><p class="border border-red-200"></p><p class="border-2 border-dashed"></p><div class="app-select-list"></div><span class="app-select-chevron"></span><div class="app-spinner"></div><div class="a4-print-container border"><p class="border"></p></div><div class="rm-measure"><p class="border"></p></div>';
  document.body.append(fixture);
  try {
    const children = [...fixture.children];
    for (const surface of children.slice(0, 4)) assert.ok(surface.matches(selector));
    for (const symbolOrPrint of children.slice(4)) assert.equal(symbolOrPrint.matches(selector), false);
    for (const printChild of fixture.querySelectorAll('.a4-print-container *, .rm-measure *')) assert.equal(printChild.matches(selector), false);
    assert.match(borderRule, /--tw-ring-shadow: 0 0 #0000/);
    assert.match(css, /:focus-visible[^}]*outline: 2px/);
  } finally { fixture.remove(); }
});
