import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { NumberInput } from '../../src/components/NumberInput';
import { useViewNavigation } from '../../src/state/useViewNavigation';
import { useInventoryViewMode } from '../../src/state/useInventoryViewMode';
import { sessionIdentity, shouldClearSessionCache } from '../../src/domain/session';
import { useCamera } from '../../src/shared/useCamera';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { DispatchQuantityModal } = await import('../../src/components/dispatch/DispatchQuantityModal');
const { mapElemento } = await import('../../src/data/mappers');

test('quantity dialog asks before adding, accepts typed amounts and confirms only once', async () => {
  const item = mapElemento({ id:'EJE001',codigo:'EJE001',nombre:'Elemento',cantidad:100,unidad:'und',especificaciones:{ peso_unitario:{ valor:40,unidad:'g' } } });
  const added: number[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(DispatchQuantityModal,{ item,inCart:0,onConfirm:(quantity: number) => added.push(quantity),onClose:() => {} })));
    assert.deepEqual(added,[]);
    const plus = document.querySelector<HTMLButtonElement>('[aria-label="Aumentar cantidad"]')!;
    const minus = document.querySelector<HTMLButtonElement>('[aria-label="Reducir cantidad"]')!;
    const input = document.querySelector<HTMLInputElement>('#dispatch-add-quantity')!;
    await act(() => plus.click()); assert.equal(input.value,'2');
    await act(() => minus.click()); assert.equal(input.value,'1');
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => { setValue.call(input,'20'); input.dispatchEvent(new dom.window.Event('input',{ bubbles:true })); });
    assert.match(document.querySelector('[role="dialog"]')!.textContent!,/0,8 kg/);
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    assert.deepEqual(added,[20]);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('quantity dialog respects stock changes and Escape closes only the selection', async () => {
  const item = mapElemento({ id:'EJE001',codigo:'EJE001',nombre:'Elemento',cantidad:10,unidad:'und' });
  let added = 0, closed = 0, outerEscapes = 0;
  const outer = () => { outerEscapes++; };
  const onClose = () => { closed++; };
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  document.addEventListener('keydown',outer);
  try {
    await act(() => root.render(createElement(DispatchQuantityModal,{ item,inCart:8,onConfirm:() => { added++; },onClose })));
    assert.equal(document.querySelector<HTMLInputElement>('#dispatch-add-quantity')!.max,'2');
    await act(() => root.render(createElement(DispatchQuantityModal,{ item:{ ...item,cantidad:8 },inCart:8,onConfirm:() => { added++; },onClose })));
    assert.equal(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,true);
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    assert.equal(added,0);
    await act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{ key:'Escape',bubbles:true })));
    assert.equal(closed,1); assert.equal(outerEscapes,0);
  } finally { document.removeEventListener('keydown',outer); await act(() => root.unmount()); host.remove(); }
});

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

test('camera changes request the selected lens and stop the previous stream', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalPlay = dom.window.HTMLMediaElement.prototype.play;
  const requested: MediaStreamConstraints[] = [];
  const stopped: string[] = [];
  const mediaDevices = {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      requested.push(constraints);
      const video = constraints.video as MediaTrackConstraints;
      const id = (video.deviceId as ConstrainDOMStringParameters)?.exact as string || 'wide';
      const track = { stop: () => stopped.push(id), getSettings: () => ({ deviceId: id, facingMode: id === 'front' ? 'user' : 'environment' }) };
      return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
    },
    enumerateDevices: async () => ['wide', 'tele', 'front'].map(id => ({ kind: 'videoinput', deviceId: id, label: id })),
    addEventListener: () => {}, removeEventListener: () => {},
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices } });
  dom.window.HTMLMediaElement.prototype.play = async () => {};
  let camera!: ReturnType<typeof useCamera>;
  function Camera({ id }: { id: string }) { camera = useCamera(true, 'environment', id); return createElement('video', { ref: camera.videoRef }); }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(Camera, { id: '' })));
    assert.equal(camera.cameras.length, 3);
    assert.equal(camera.currentDeviceId, 'wide');
    await act(async () => root.render(createElement(Camera, { id: 'tele' })));
    assert.deepEqual((requested[1].video as MediaTrackConstraints).deviceId, { exact: 'tele' });
    assert.deepEqual(stopped, ['wide']);
    await act(async () => root.render(createElement(Camera, { id: 'front' })));
    assert.equal(camera.mirrored, true);
    assert.equal(camera.currentDeviceId, 'front');
    assert.deepEqual(stopped, ['wide', 'tele']);
  } finally {
    await act(() => root.unmount()); host.remove();
    dom.window.HTMLMediaElement.prototype.play = originalPlay;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
  assert.deepEqual(stopped, ['wide', 'tele', 'front']);
});
