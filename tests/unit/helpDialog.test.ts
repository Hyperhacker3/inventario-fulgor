import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, lazy, Suspense, useCallback, useState } from 'react';
import { HelpDialog } from '../../src/components/help/HelpDialog';
import { helpGuide } from '../../src/components/help/helpGuide';
import { MobileMenu } from '../../src/components/navigation/MobileMenu';
import { Presence } from '../../src/components/ui/Motion';
import { useViewNavigation } from '../../src/state/useViewNavigation';

function setup() {
  const dom = new JSDOM('<html><body></body></html>', { url: 'https://app.test/#/explorer' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(dom.window.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  return dom;
}
const initial = setup();
const { createRoot } = await import('react-dom/client');
initial.window.close();
const until = async (check: () => boolean) => {
  for (let index = 0; index < 100; index++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    if (check()) return;
  }
  assert.fail('No se alcanzó el estado esperado del diálogo');
};

test('help opens with uppercase collapsed titles, expands each topic independently and keeps keyboard focus inside', async () => {
  const dom = setup(), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let closed = 0;
  try {
    await act(() => root.render(h(HelpDialog, { open: true, onClose: () => { closed++; } })));
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    assert.equal(dialog.parentElement!.parentElement, document.body);
    assert.equal(host.childElementCount, 0);
    const close = dialog.querySelector<HTMLButtonElement>('[aria-label="Cerrar ayuda"]')!;
    assert.equal(document.activeElement, close);
    const topics = [...dialog.querySelectorAll<HTMLButtonElement>('h3 button')];
    assert.equal(topics.length, helpGuide.length);
    for (const [index, topic] of topics.entries()) {
      assert.equal(topic.textContent, helpGuide[index].title.toLocaleUpperCase('es'));
      assert.equal(topic.getAttribute('aria-expanded'), 'false');
      assert.equal(document.getElementById(topic.getAttribute('aria-controls')!)!.hidden, true);
    }
    await act(() => topics[0].click()); await act(() => topics[1].click());
    assert.equal(topics[0].getAttribute('aria-expanded'), 'true');
    assert.equal(topics[1].getAttribute('aria-expanded'), 'true');
    assert.match(document.getElementById(topics[0].getAttribute('aria-controls')!)!.textContent!, /Consulte el resumen/);
    await act(() => topics[0].click());
    assert.equal(document.getElementById(topics[0].getAttribute('aria-controls')!)!.hidden, true);
    assert.equal(topics[1].getAttribute('aria-expanded'), 'true');
    topics.at(-1)!.focus();
    await act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, close);
    await act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(closed, 1);
  } finally { await act(() => root.unmount()); host.remove(); dom.window.close(); }
});

test('mobile menu can hand off to cold-loaded help without stale route events closing it, and Back still closes the top dialog', async () => {
  const dom = setup(), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let load!: (module: { default: typeof HelpDialog }) => void, restores = 0;
  const LazyHelp = lazy(() => new Promise<{ default: typeof HelpDialog }>(resolve => { load = resolve; }));
  function App() {
    const [menu, setMenu] = useState(false), [help, setHelp] = useState(false);
    const restore = useCallback(() => { restores++; setHelp(false); }, []);
    const navigation = useViewNavigation(restore);
    return h('div', null, h('button', { id: 'open-menu', onClick: () => setMenu(true) }, 'Menú'),
      h('output', null, navigation.activeView),
      h(MobileMenu, { open: menu, onClose: () => setMenu(false), items: [], activeView: navigation.activeView,
        onNavigate: navigation.setActiveView, search: '', onSearch: () => {}, onHelp: () => { setMenu(false); setHelp(true); }, onSignOut: () => {} }),
      h(Suspense, { fallback: null }, h(Presence, { open: help, children: help && h(LazyHelp, { open: help, onClose: () => setHelp(false) }) })));
  }
  const helpOpen = () => !!document.querySelector('.ui-modal-layer[data-motion-open="true"]');
  try {
    await act(() => root.render(h(App)));
    await act(() => document.querySelector<HTMLButtonElement>('#open-menu')!.click());
    await act(() => document.querySelector<HTMLButtonElement>('[data-nav-view="help"]')!.click());
    await until(() => window.history.state?.fulgorDialog !== true);
    await act(async () => load({ default: HelpDialog }));
    assert.equal(helpOpen(), true);
    assert.equal(document.querySelector('.mobile-menu-layer')!.getAttribute('data-open'), 'false');
    await act(() => window.dispatchEvent(new dom.window.HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href })));
    assert.equal(helpOpen(), true); assert.equal(restores, 0);
    await act(() => window.history.back());
    await until(() => !helpOpen());
    assert.equal(host.querySelector('output')!.textContent, 'explorer'); assert.equal(restores, 0);
    await act(() => document.querySelector<HTMLButtonElement>('#open-menu')!.click());
    await act(() => document.querySelector<HTMLButtonElement>('[data-nav-view="help"]')!.click());
    await until(helpOpen);
    await act(() => { window.location.hash = '#/history'; });
    await until(() => host.querySelector('output')!.textContent === 'history');
    assert.equal(helpOpen(), false); assert.equal(restores, 1);
  } finally { await act(() => root.unmount()); host.remove(); dom.window.close(); }
});
