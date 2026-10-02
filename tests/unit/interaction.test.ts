import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { NumberInput } from '../../src/components/NumberInput';
import { useViewNavigation } from '../../src/state/useViewNavigation';
import { useInventoryViewMode } from '../../src/state/useInventoryViewMode';
import { sessionIdentity, shouldClearSessionCache } from '../../src/domain/session';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');

test('numeric fields can be cleared, require a replacement, and accept zero and decimals', async () => {
  let quantity = 0;
  function Form() {
    const [value, setValue] = useState(0);
    return createElement('form', null, createElement(NumberInput, {
      value, required: true, min: 0, step: '0.001',
      onValueChange: (next: number) => { quantity = next; setValue(next); },
    }));
  }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(Form)));
    const input = host.querySelector('input')!;
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!;
    const type = async (text: string) => {
      await act(() => {
        setValue.call(input, text);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    };
    await type('');
    assert.equal(input.value, '');
    assert.equal(host.querySelector('form')!.checkValidity(), false);
    assert.equal(quantity, 0);
    await type('12.375');
    assert.equal(quantity, 12.375);
    assert.equal(input.value, '12.375');
    await type('0');
    assert.equal(quantity, 0);
    assert.equal(host.querySelector('form')!.checkValidity(), true);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('reconfirming the same signed-in account preserves cache; account and role changes clear it', () => {
  const account = { user: { id: 'test-user', app_metadata: { role: 'admin' } } };
  const identity = sessionIdentity(account);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity(account)), false);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity({ user: { id: 'other-user', app_metadata: { role: 'admin' } } })), true);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity({ user: { id: 'test-user', app_metadata: { role: 'consulta' } } })), true);
  assert.equal(shouldClearSessionCache(identity, null), true);
});

test('browser back and forward restore app screens without leaving the app', async () => {
  window.history.replaceState(null, '', '/');
  let navigation!: ReturnType<typeof useViewNavigation>;
  let restored = false;
  const onRestore = () => { restored = true; };
  function Screen() {
    navigation = useViewNavigation(onRestore);
    return createElement('output', null, navigation.activeView);
  }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(Screen)));
    await act(() => navigation.setActiveView('explorer'));
    await act(() => navigation.setActiveView('history'));
    assert.equal(restored, false);
    const traverse = async (direction: 'back' | 'forward') => {
      await act(async () => {
        const popped = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
        window.history[direction]();
        await popped;
      });
    };
    await traverse('back');
    assert.equal(restored, true);
    assert.equal(host.textContent, 'explorer');
    await traverse('back');
    assert.equal(host.textContent, 'dashboard');
    await traverse('forward');
    assert.equal(host.textContent, 'explorer');
    assert.equal(window.location.origin, 'https://app.test');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('inventory list preference survives leaving and reopening the screen', async () => {
  localStorage.clear();
  let selectMode!: (mode: 'grid' | 'list') => void;
  function View() {
    const [mode, select] = useInventoryViewMode();
    selectMode = select;
    return createElement('output', null, mode);
  }
  const host = document.body.appendChild(document.createElement('div'));
  let root = createRoot(host);
  try {
    await act(() => root.render(createElement(View)));
    await act(() => selectMode('list'));
    await act(() => root.unmount());
    root = createRoot(host);
    await act(() => root.render(createElement(View)));
    assert.equal(host.textContent, 'list');
  } finally { await act(() => root.unmount()); host.remove(); }
});
