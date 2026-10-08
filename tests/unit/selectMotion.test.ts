import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useRef, useState } from 'react';
import { Select } from '../../src/components/ui/Select';
import { Presence, ScreenTransition } from '../../src/components/ui/Motion';
import { useDialogFocus } from '../../src/hooks/useDialogFocus';
import { DispatchQuantityModal } from '../../src/components/dispatch/DispatchQuantityModal';
import { mapElemento } from '../../src/data/mappers';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const option = (value: string, label: string, disabled = false) => h('option', { value, disabled, key: value }, label);
const key = (element: HTMLElement, value: string) => element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 210)); }); };

function Field({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return h('form', null, h('label', { htmlFor: 'category' }, 'Categoría'),
    h(Select, { id: 'category', name: 'category', required: true, disabled, value, onChange: event => setValue(event.target.value), className: 'w-full border p-3' },
      option('', 'Seleccione una categoría'), option('NEW', '+ Crear categoría'), option('OLD', 'Inactiva', true), option('ELECTRIC', 'Eléctrica'), option('TOOLS', 'Herramientas')));
}

test('custom select uses the styled portal, commits by pointer, preserves required validation and form values', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Field)));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    assert.equal(host.querySelector('label')!.htmlFor, trigger.id);
    await act(() => assert.equal(host.querySelector('form')!.checkValidity(), false));
    assert.equal(document.activeElement, trigger); assert.equal(trigger.getAttribute('aria-invalid'), 'true');
    await act(() => trigger.click());
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    assert.equal(host.contains(list), false); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.deepEqual([...list.querySelectorAll('[role="option"]')].map(value => value.getAttribute('data-value')), ['', 'NEW', 'OLD', 'ELECTRIC', 'TOOLS']);
    await act(() => list.querySelector<HTMLButtonElement>('[data-value="ELECTRIC"]')!.click());
    assert.match(trigger.textContent!, /Eléctrica/); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(new dom.window.FormData(host.querySelector('form')!).get('category'), 'ELECTRIC');
    assert.equal(host.querySelector('form')!.checkValidity(), true); assert.equal(document.activeElement, trigger);
    assert.ok(list.closest('[inert]')); await settle(); assert.equal(document.querySelector('[role="listbox"]'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('keyboard choice skips disabled options, supports Home/End and accented typeahead, and commits only on confirmation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Field)));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(() => { trigger.focus(); key(trigger, 'ArrowDown'); });
    await act(() => key(trigger, 'ArrowDown')); // Create
    await act(() => key(trigger, 'ArrowDown')); // Skip inactive
    assert.equal(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.getAttribute('data-value'), 'ELECTRIC');
    assert.equal(new dom.window.FormData(host.querySelector('form')!).get('category'), '');
    await act(() => key(trigger, 'End'));
    assert.equal(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.getAttribute('data-value'), 'TOOLS');
    await act(() => { key(trigger, 'Home'); key(trigger, 'e'); });
    assert.equal(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.getAttribute('data-value'), 'ELECTRIC');
    await act(() => key(trigger, 'Enter')); assert.match(trigger.textContent!, /Eléctrica/);
    await act(() => key(trigger, 'ArrowDown')); await act(() => key(trigger, 'Tab'));
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('Escape dismisses a selector before its enclosing dialog and outside taps dismiss without changing the value', async () => {
  let closed = 0;
  function Dialog() {
    const ref = useRef<HTMLElement>(null); useDialogFocus(ref, () => closed++);
    return h('section', { ref, role: 'dialog' }, h('button', { 'data-dialog-close': true }, 'Cerrar'), h(Field));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Dialog)));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(() => { trigger.focus(); trigger.click(); }); await act(() => key(trigger, 'Escape'));
    assert.equal(closed, 0); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await act(() => trigger.click());
    await act(() => document.body.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })));
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await act(() => key(trigger, 'Escape')); assert.equal(closed, 1);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('disabled fields cannot reopen or commit, including an enclosing fieldset disabled while the list is open', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h('fieldset', null, h(Field))));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(() => trigger.click());
    const target = document.querySelector<HTMLButtonElement>('[data-value="ELECTRIC"]')!;
    await act(async () => { host.querySelector('fieldset')!.disabled = true; target.click(); });
    assert.equal(host.querySelector('select')!.value, ''); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await act(() => trigger.click()); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await act(() => root.render(h(Field, { disabled: true })));
    assert.equal(host.querySelector<HTMLButtonElement>('[role="combobox"]')!.disabled, true);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('dropdown fits a small viewport, opens upward near the bottom and closes when its scroll container moves', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const previousWidth = window.innerWidth, previousHeight = window.innerHeight;
  try {
    Object.defineProperties(window, { innerWidth: { value: 320, configurable: true }, innerHeight: { value: 240, configurable: true } });
    await act(() => root.render(h(Field)));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    trigger.getBoundingClientRect = () => ({ left: 100, right: 380, top: 170, bottom: 214, width: 280, height: 44, x: 100, y: 170, toJSON() {} });
    await act(() => trigger.click());
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    assert.ok(parseFloat(list.style.left) + parseFloat(list.style.width) <= 308);
    assert.ok(parseFloat(list.style.top) < 170); assert.ok(parseFloat(list.style.maxHeight) <= 154);
    Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true });
    await act(() => window.dispatchEvent(new dom.window.Event('resize')));
    assert.equal(trigger.getAttribute('aria-expanded'), 'true'); assert.ok(parseFloat(list.style.top) >= 214);
    await act(() => list.dispatchEvent(new dom.window.Event('scroll'))); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    await act(() => host.dispatchEvent(new dom.window.Event('scroll'))); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally {
    Object.defineProperties(window, { innerWidth: { value: previousWidth, configurable: true }, innerHeight: { value: previousHeight, configurable: true } });
    await act(() => root.unmount()); host.remove();
  }
});

test('closing a panel disables it immediately, keeps the last content during the effect and cancels exit when reopened', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const content = h('div', { className: 'ui-panel-enter' }, h('button', null, 'Guardar'));
  try {
    await act(() => root.render(h(Presence, { open: true, children: content })));
    await act(() => root.render(h(Presence, { open: false, children: null })));
    assert.ok(host.querySelector('button')!.closest('[inert][aria-hidden="true"]'));
    await act(() => root.render(h(Presence, { open: true, children: content }))); await settle();
    assert.ok(host.querySelector('button')); assert.equal(host.querySelector('[inert]'), null);
    await act(() => root.render(h(Presence, { open: false, children: null }))); await settle();
    assert.equal(host.textContent, '');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('screen changes preserve the current screen across refreshes and keep only one inert outgoing screen during rapid navigation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  function Screen({ name }: { name: string }) {
    const [value, setValue] = useState(0);
    return h('button', { onClick: () => setValue(value + 1) }, `${name}:${value}`);
  }
  const show = (name: string) => act(() => root.render(h(ScreenTransition, { screen: name, children: h(Screen, { name }) })));
  try {
    await show('Inventario'); await act(() => host.querySelector('button')!.click()); await show('Inventario');
    assert.equal(host.textContent, 'Inventario:1');
    await show('Entradas'); assert.match(host.querySelector('[inert]')!.textContent!, /Inventario:1/);
    assert.match(host.querySelector('.ui-screen-current')!.textContent!, /Entradas:0/);
    await show('Salidas'); assert.equal(host.querySelectorAll('[inert]').length, 1);
    assert.doesNotMatch(host.textContent!, /Inventario/);
    await settle(); assert.equal(host.textContent, 'Salidas:0'); assert.equal(host.querySelector('[inert]'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('reduced-motion preference removes outgoing content without waiting for the normal animation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const previous = window.matchMedia;
  window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
  try {
    await act(() => root.render(h(Presence, { open: true, children: h('button', null, 'Guardar') })));
    await act(async () => { root.render(h(Presence, { open: false, children: null })); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(host.textContent, '');
  } finally { window.matchMedia = previous; await act(() => root.unmount()); host.remove(); }
});

test('a closing portaled quantity dialog becomes inert immediately and cannot add material during its exit', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let added = 0;
  const content = h(DispatchQuantityModal, { item: mapElemento({ id: 'MAT-1', codigo: 'MAT001', nombre: 'Material', cantidad: 4, unidad: 'UND' }),
    inCart: 0, onConfirm: () => added++, onClose: () => {} });
  try {
    await act(() => root.render(h(Presence, { open: true, children: content })));
    assert.ok(document.querySelector('[role="dialog"]'));
    await act(() => root.render(h(Presence, { open: false, children: null })));
    const form = document.querySelector<HTMLFormElement>('[role="dialog"]')!;
    assert.equal(form.closest<HTMLElement>('.ui-modal-layer')!.dataset.motionOpen, 'false');
    assert.ok(form.closest('[inert][aria-hidden="true"]'));
    await act(() => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(added, 0); await settle(); assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});
