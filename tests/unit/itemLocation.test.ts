import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ItemDetailContent } from '../../src/components/ItemDetailModal';
import { changedItemLocation, itemLocationColumns, itemLocationDraft } from '../../src/domain/itemLocation';
import { mapElemento } from '../../src/data/mappers';
import type { Almacen, Estanteria, Caja, Elemento } from '../../src/types';

const warehouses: Almacen[] = ['Norte', 'Sur'].map((nombre, index) => ({ id: `w${index + 1}`, nombre, codigo: nombre, ciudad: '', capacidadPorcentaje: 0, estado: 'Operativo' }));
const racks: Estanteria[] = [{ id: 'r1', almacenId: 'w1', nombre: 'A', codigo: 'A' }, { id: 'r2', almacenId: 'w2', nombre: 'B', codigo: 'B' }];
const boxes: Caja[] = [{ id: 'b1', estanteriaId: 'r1', codigoCaja: 'Caja A', estado: 'Completa' }, { id: 'b2', estanteriaId: 'r2', codigoCaja: 'Caja B', estado: 'Completa' }];
const item = mapElemento({ id: 'MAT-1', codigo: 'MAT001', nombre: 'Material', cantidad: 12, unidad: 'UND', almacen_id: 'w1', estanteria_id: 'r1', caja_id: 'b1' });
test('location edits preserve unchanged columns and explicitly clear dependent database IDs with null', () => {
  assert.deepEqual(changedItemLocation(itemLocationDraft(item), item), {});
  assert.deepEqual(itemLocationColumns({ nombre: 'Otro nombre' }), {});
  const changed = changedItemLocation({ warehouseId: 'w2', rackId: '', boxId: '' }, item);
  assert.deepEqual(itemLocationColumns(changed), { almacen_id: 'w2', estanteria_id: null, caja_id: null });
  assert.deepEqual(itemLocationColumns(changedItemLocation(itemLocationDraft(), item)), { almacen_id: null, estanteria_id: null, caja_id: null });
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(value => value.textContent?.trim() === text)!;
const field = (host: HTMLElement, label: string) => {
  const target = [...host.querySelectorAll<HTMLLabelElement>('label')].find(value => value.textContent === label)!;
  return document.getElementById(target.htmlFor) as HTMLButtonElement;
};
const native = (host: HTMLElement, label: string) => document.getElementById(`${field(host, label).id}-value`) as HTMLSelectElement;
const choose = async (host: HTMLElement, label: string, value: string) => {
  const control = field(host, label);
  await act(() => control.click());
  const options = document.getElementById(`${control.id}-options`)!;
  const target = [...options.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(option => option.dataset.value === value)!;
  assert.ok(target); await act(() => target.click());
};
function inventory(updateElemento: (id: string, updates: Partial<Elemento>) => Promise<void>, role = 'admin') {
  return { user: { name: 'Admin', email: 'test@app.test', role, avatar: '' }, almacenes: warehouses, estanterias: racks, cajas: boxes,
    updateElemento, deleteElemento: async () => {}, getLocationString: () => 'Norte > A > Caja A', categoryLabel: (id: string) => id,
    openQuickMovement: () => {}, addToDispatchCart: () => {} };
}
test('editing preselects the current location, offers only existing compatible locations and cancel discards relocation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let saves = 0;
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => {}, inventory: inventory(async () => { saves++; }) })));
    await act(() => button(host, 'Editar').click());
    assert.equal(native(host, 'Almacén').value, 'w1'); assert.equal(native(host, 'Estantería').value, 'r1'); assert.equal(native(host, 'Caja').value, 'b1');
    assert.deepEqual([...native(host, 'Caja').options].map(option => option.value), ['', 'b1']);
    assert.equal(host.querySelector('option[value^="__NEW"]'), null);
    await choose(host, 'Almacén', 'w2');
    assert.equal(native(host, 'Estantería').value, ''); assert.equal(native(host, 'Caja').value, ''); assert.equal(field(host, 'Caja').disabled, true);
    assert.deepEqual([...native(host, 'Estantería').options].map(option => option.value), ['', 'r2']);
    await choose(host, 'Estantería', 'r2'); await choose(host, 'Caja', 'b2');
    await act(() => button(host, 'Cancelar').click());
    await act(() => button(host, 'Editar').click());
    assert.equal(native(host, 'Almacén').value, 'w1'); assert.equal(native(host, 'Caja').value, 'b1'); assert.equal(saves, 0);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('save submits all three location IDs once, preserves a failed draft and closes only after success', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let calls = 0, fail!: (cause: Error) => void;
  const request = new Promise<void>((_resolve, reject) => { fail = reject; });
  const payloads: Partial<Elemento>[] = [];
  const update = async (id: string, updates: Partial<Elemento>) => { assert.equal(id, item.id); calls++; payloads.push(updates); if (calls === 1) await request; };
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => {}, inventory: inventory(update) })));
    await act(() => button(host, 'Editar').click());
    await choose(host, 'Almacén', 'w2'); await choose(host, 'Estantería', 'r2'); await choose(host, 'Caja', 'b2');
    const submit = () => host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await act(() => { submit(); submit(); }); assert.equal(calls, 1);
    assert.equal(field(host, 'Almacén').disabled, true);
    assert.deepEqual([payloads[0].almacenId, payloads[0].estanteriaId, payloads[0].cajaId], ['w2', 'r2', 'b2']);
    assert.equal(payloads[0].cantidad, undefined);
    await act(async () => fail(new Error('Sin conexión')));
    assert.match(host.querySelector('[role="alert"]')!.textContent!, /Sin conexión/); assert.equal(native(host, 'Caja').value, 'b2');
    await act(async () => { submit(); }); assert.equal(calls, 2);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 210)); });
    assert.equal(host.querySelector('form'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('read-only and archived product details do not expose the edit form', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    for (const props of [{ item, inventory: inventory(async () => {}, 'consulta') }, { item: { ...item, archived: true }, inventory: inventory(async () => {}) }]) {
      await act(() => root.render(h(ItemDetailContent, { ...props, onClose: () => {} })));
      assert.equal(button(host, 'Editar'), undefined); assert.equal(host.querySelector('form'), null);
    }
  } finally { await act(() => root.unmount()); host.remove(); }
});
