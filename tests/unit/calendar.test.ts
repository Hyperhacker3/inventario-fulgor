import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useRef, useState } from 'react';
import { DatePicker } from '../../src/components/ui/DatePicker';
import { DispatchCartLine } from '../../src/components/dispatch/DispatchCartLine';
import { calendarCells, calendarDate, calendarLabel, shiftCalendarDay, shiftCalendarMonth } from '../../src/domain/calendar';
import { useDialogFocus } from '../../src/hooks/useDialogFocus';
import { mapElemento } from '../../src/data/mappers';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const key = (element: HTMLElement, value: string) => element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
const click = async (element: HTMLElement) => { await act(() => element.click()); };
const day = (value: string) => document.querySelector<HTMLButtonElement>(`.ui-presence[data-open='true'] [data-date="${value}"]`)!;
function Field({ initial = '', disabled = false }: { initial?: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return h('form', null, h(DatePicker, { id: 'departure', label: 'Fecha de salida', name: 'date', required: true, value,
    min: '2024-02-01', max: '2024-04-30', disabled, onChange: setValue }));
}
async function withField(check: (host: HTMLElement, trigger: HTMLButtonElement) => Promise<void>, initial = '2024-02-29') {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Field, { initial })));
    await check(host, host.querySelector<HTMLButtonElement>('.app-date-trigger')!);
  } finally { await act(() => root.unmount()); host.remove(); }
}

test('calendar uses Monday-first Spanish dates and handles leap days, invalid dates and month boundaries without local-time arithmetic', () => {
  assert.equal(calendarDate('2023-02-29'), null); assert.equal(calendarDate('2024-04-31'), null);
  assert.equal(calendarDate('invalid'), null); assert.ok(calendarDate('2024-02-29'));
  assert.equal(shiftCalendarDay('2024-02-29', 1), '2024-03-01');
  assert.equal(shiftCalendarMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(shiftCalendarMonth('2024-02-29', 12), '2025-02-28');
  const cells = calendarCells('2024-02-01');
  assert.equal(cells.length, 42); assert.equal(cells[0], '2024-01-29'); assert.equal(cells.at(-1), '2024-03-10');
  assert.match(calendarLabel('2024-02-29'), /29 de febrero de 2024/);
});

test('calendar replaces the native popup, commits ISO form values and restores focus while retaining required validation', async () => {
  await withField(async (host, trigger) => {
    await act(() => assert.equal(host.querySelector('form')!.checkValidity(), false));
    assert.equal(document.activeElement, trigger); assert.equal(trigger.getAttribute('aria-invalid'), 'true');
    await click(trigger);
    const panel = document.querySelector<HTMLElement>('.app-calendar')!;
    assert.equal(host.contains(panel), false); assert.equal(panel.getAttribute('role'), 'dialog');
    assert.equal(panel.querySelectorAll('[role="gridcell"]').length, 42);
    assert.ok(day('2024-05-01').disabled); assert.equal(panel.querySelector('[aria-label="Mes siguiente"]')!.getAttribute('disabled'), '');
    await click(day('2024-04-20'));
    assert.equal(new dom.window.FormData(host.querySelector('form')!).get('date'), '2024-04-20');
    assert.equal(host.querySelector('form')!.checkValidity(), true); assert.match(trigger.textContent!, /20\/04\/2024/);
    assert.equal(document.activeElement, trigger); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.ok(panel.closest('[inert]'));
  }, '');
});

test('calendar keyboard navigates across months, clamps to bounds and changes the value only when a date is chosen', async () => {
  await withField(async (host, trigger) => {
    await click(trigger); assert.equal(document.activeElement, day('2024-02-29'));
    await act(() => key(day('2024-02-29'), 'ArrowRight'));
    assert.equal(document.activeElement, day('2024-03-01'));
    assert.equal(new dom.window.FormData(host.querySelector('form')!).get('date'), '2024-02-29');
    await act(() => key(day('2024-03-01'), 'Home')); assert.equal(document.activeElement, day('2024-02-26'));
    await act(() => key(day('2024-02-26'), 'PageUp')); assert.equal(document.activeElement, day('2024-02-01'));
    await act(() => key(day('2024-02-01'), 'ArrowLeft')); assert.equal(document.activeElement, day('2024-02-01'));
    await click(day('2024-02-01')); assert.equal(host.querySelector<HTMLInputElement>('input')!.value, '2024-02-01');
  });
});

test('Escape closes a month selector before the calendar, then the calendar before the parent dialog; backdrop leaves the value unchanged', async () => {
  let closed = 0;
  function Dialog() {
    const ref = useRef<HTMLElement>(null); useDialogFocus(ref, () => closed++);
    return h('section', { ref, role: 'dialog' }, h('button', { 'data-dialog-close': true }, 'Cerrar'), h(Field, { initial: '2024-02-29' }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Dialog)));
    const trigger = host.querySelector<HTMLButtonElement>('.app-date-trigger')!;
    await click(trigger);
    const month = document.querySelector<HTMLButtonElement>('.app-calendar [aria-label="Mes"]')!;
    await click(month); await act(() => key(month, 'Escape'));
    assert.equal(month.getAttribute('aria-expanded'), 'false'); assert.equal(trigger.getAttribute('aria-expanded'), 'true'); assert.equal(closed, 0);
    await act(() => key(month, 'Escape')); assert.equal(trigger.getAttribute('aria-expanded'), 'false'); assert.equal(closed, 0);
    await click(trigger); await click(document.querySelector<HTMLButtonElement>('.ui-presence[data-open="true"] [aria-label="Cerrar calendario al tocar fuera"]')!);
    assert.equal(host.querySelector<HTMLInputElement>('input')!.value, '2024-02-29');
    assert.equal(document.activeElement, trigger);
    await act(() => key(trigger, 'Escape')); assert.equal(closed, 1);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('calendar closes when an enclosing fieldset is disabled and cannot commit or reopen; clearing restores required validation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h('fieldset', null, h(Field, { initial: '2024-02-29' }))));
    const trigger = host.querySelector<HTMLButtonElement>('.app-date-trigger')!;
    await click(trigger);
    const target = day('2024-02-20');
    await act(async () => { host.querySelector('fieldset')!.disabled = true; target.click(); });
    assert.equal(host.querySelector<HTMLInputElement>('input')!.value, '2024-02-29');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false'); await click(trigger); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await act(() => { host.querySelector('fieldset')!.disabled = false; });
    await click(trigger); const clear = [...document.querySelectorAll<HTMLButtonElement>('.ui-presence[data-open="true"] .app-calendar button')].find(button => button.textContent === 'Limpiar')!;
    await click(clear); assert.equal(host.querySelector<HTMLInputElement>('input')!.value, '');
    await act(() => assert.equal(host.querySelector('form')!.checkValidity(), false));
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('cart materials open from the entire surface, name opens once, and quantity/remove actions remain independent', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let opened = 0, removed = 0; const quantities: number[] = [];
  const elemento = mapElemento({ id: 'test', codigo: 'MAT001', nombre: 'Material con nombre extenso', categoria: 'OTROS', cantidad: 12, unidad: 'UND' });
  try {
    await act(() => root.render(h(DispatchCartLine, { item: { elemento, cantidad: 2 }, onOpen: () => opened++, onRemove: () => removed++, onQuantity: quantity => quantities.push(quantity) })));
    await click(host.querySelector<HTMLElement>('.ui-product')!); await click(host.querySelector<HTMLElement>('.font-mono-code')!);
    await click(host.querySelector<HTMLButtonElement>('.ui-product-open')!); assert.equal(opened, 3);
    await click(host.querySelector<HTMLButtonElement>('[aria-label^="Sumar"]')!); await click(host.querySelector<HTMLButtonElement>('[aria-label^="Restar"]')!);
    await click(host.querySelector<HTMLInputElement>('input')!); await click(host.querySelector<HTMLButtonElement>('[aria-label^="Quitar"] span')!);
    assert.deepEqual(quantities, [3, 1]); assert.equal(removed, 1); assert.equal(opened, 3);
    const range = document.createRange(); range.selectNodeContents(host.querySelector('.ui-product-open')!);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    assert.equal(document.getSelection()!.isCollapsed, false);
    await click(host.querySelector<HTMLElement>('.ui-product')!); assert.equal(opened, 3);
    document.getSelection()!.removeAllRanges();
    await act(() => root.render(h('fieldset', { disabled: true }, h(DispatchCartLine, { item: { elemento, cantidad: 2 }, onOpen: () => opened++, onRemove: () => removed++, onQuantity: quantity => quantities.push(quantity) }))));
    await click(host.querySelector<HTMLElement>('.ui-product')!); await click(host.querySelector<HTMLButtonElement>('.ui-product-open')!);
    assert.equal(opened, 3);
  } finally { document.getSelection()?.removeAllRanges(); await act(() => root.unmount()); host.remove(); }
});
