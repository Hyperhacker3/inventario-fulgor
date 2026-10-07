import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { mapElemento } from '../../src/data/mappers';
import type { RegistrationInventory } from '../../src/components/ItemRegistrationForm';
import { viewFromHash } from '../../src/state/useViewNavigation';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const { EntryContent } = await import('../../src/components/EntryView');
const item = mapElemento({ id: 'i1', codigo: 'MAT001', nombre: 'MATERIAL EXISTENTE', marca: 'MARCA', categoria: 'cat', cantidad: 4, unidad: 'UND', almacen_id: 'w1', descripcion: 'Descripción del material' });
const forbidden = async () => { throw new Error('Unexpected catalog write'); };
const fixture = (role = 'admin') => ({
  user: { name: 'Usuario', role, email: 'test@app.test', avatar: '' }, elementos: [item],
  almacenes: [{ id: 'w1', codigo: 'W01', nombre: 'Central', ciudad: '', estado: 'Operativo', capacidadPorcentaje: 0 }],
  estanterias: [], niveles: [], cajas: [], prefijos: [{ id: 'prefix', prefijo: 'MAT', nombre: 'Material', activo: true, ultimo: 1 }],
  categorias: [{ id: 'cat', nombre: 'GENERAL', activo: true }], catalogReady: true, catalogLoading: false,
  refreshCatalog: forbidden, createCategoria: forbidden, createPrefijo: forbidden, addCaja: forbidden, addEstanteria: forbidden, addNivel: forbidden,
  addElemento: forbidden, addStockMovement: forbidden, setActiveView: () => {}, categoryLabel: () => 'GENERAL',
  getLocationString: () => 'Central', openItemDetail: () => {}, syncStatus: 'synced',
}) as RegistrationInventory & { getLocationString: () => string; openItemDetail: () => void; syncStatus: 'synced' };
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(control => control.textContent?.trim() === text)!;
const type = async (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(() => {
    const prototype = field instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
};
const choose = async (host: HTMLElement, id: string, value: string) => {
  await act(() => host.querySelector<HTMLButtonElement>(`#${id}`)!.click());
  await act(() => document.querySelector<HTMLButtonElement>(`#${id}-options [data-value="${value}"]`)!.click());
};
const submit = (form: HTMLFormElement) => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

test('Entries registers a new material under the search, preserves failed drafts and request identity, and blocks duplicate creation and selection while pending', async () => {
  const inventory = fixture();
  const payloads: unknown[] = [], requests: unknown[] = [];
  let complete!: (value: typeof item) => void;
  inventory.addElemento = async (input, options) => {
    payloads.push(input); requests.push(options);
    if (payloads.length === 1) throw new Error('Error de conexión');
    return new Promise(resolve => { complete = resolve; });
  };
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(EntryContent, { inventory })));
    assert.equal(button(host, 'Agregar nuevo ítem'), undefined);
    assert.doesNotMatch(host.textContent!, /Datos de la entrada|Registrar Componente/);
    assert.ok(host.querySelector('#input-nombre')); assert.ok(host.querySelector('#select-estanteria-form'));
    assert.ok(host.querySelector('#select-nivel-form')); assert.ok(host.querySelector('#select-caja-form'));
    await choose(host, 'select-prefijo', 'prefix'); await choose(host, 'select-categoria', 'cat');
    await type(host.querySelector('#input-nombre')!, 'material nuevo'); await type(host.querySelector('#input-marca')!, 'marca nueva');
    await type(host.querySelector('#input-stock-inicial')!, '2');
    await act(async () => { submit(host.querySelector('form')!); });
    assert.match(host.querySelector('[role="alert"]')!.textContent!, /Error de conexión/);
    assert.equal(host.querySelector<HTMLInputElement>('#input-nombre')!.value, 'material nuevo');
    await act(async () => { submit(host.querySelector('form')!); submit(host.querySelector('form')!); });
    assert.equal(payloads.length, 2); assert.deepEqual(requests[0], requests[1]);
    assert.equal(host.querySelector<HTMLInputElement>('[type="search"]')!.disabled, true);
    assert.equal((payloads[1] as typeof item).nombre, 'MATERIAL NUEVO'); assert.equal((payloads[1] as typeof item).marca, 'MARCA NUEVA');
    assert.equal((payloads[1] as typeof item).cantidad, 2);
    await act(async () => complete({ ...item, id: 'new', codigo: 'MAT002' }));
    assert.match(host.querySelector('[role="status"]')!.textContent!, /MAT002 registrado/);
    assert.equal(host.querySelector<HTMLInputElement>('#input-nombre')!.value, '');
    assert.equal(host.querySelector<HTMLInputElement>('#input-stock-inicial')!.value, '0');
    assert.equal(host.querySelector<HTMLInputElement>('[type="search"]')!.disabled, false);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('selecting an existing product fills its data and receives stock without creating or overwriting the catalog; clearing restores registration', async () => {
  const inventory = fixture(); let receipts = 0;
  inventory.addStockMovement = async input => {
    receipts++; assert.equal(input.elementoId, item.id); assert.equal(input.cantidad, 2); assert.equal(input.motivo, 'Recepción');
    return { id: 'movement', tipo: 'ENTRADA', elementoId: item.id, itemCode: item.codigo, itemName: item.nombre, cantidad: 2,
      unidad: item.unidad, stockAnterior: 4, stockNuevo: 6, motivo: 'Recepción', responsable: 'Usuario', fecha: '2026-10-07', hora: '10:00', docType: 'view' };
  };
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(EntryContent, { inventory })));
    await type(host.querySelector('[type="search"]')!, 'MAT001'); await act(() => button(host, 'Seleccionar').click());
    assert.equal(host.querySelector<HTMLInputElement>('#input-nombre')!.value, item.nombre);
    assert.equal(host.querySelector<HTMLInputElement>('#input-marca')!.value, item.marca);
    assert.equal(host.querySelector<HTMLInputElement>('#input-nombre')!.matches(':disabled'), true);
    assert.equal(host.querySelector('#select-prefijo'), null); assert.equal(host.querySelector('#input-stock-inicial'), null);
    assert.equal(host.querySelectorAll('form').length, 1); // Reception form is never nested inside a creation form.
    const form = host.querySelector('form')!;
    await type(form.querySelector('input')!, '2'); await type(form.querySelector('textarea')!, 'Recepción');
    await act(async () => { submit(form); submit(form); });
    assert.equal(receipts, 1); assert.match(form.textContent!, /Stock tras este movimiento: 6/);
    await act(() => button(host, 'Quitar selección').click());
    assert.equal(host.querySelector<HTMLInputElement>('#input-nombre')!.value, ''); assert.ok(host.querySelector('#select-prefijo'));
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('operators receive existing materials without a creation form, and old New Item links resolve to Entries', async () => {
  assert.equal(viewFromHash('#/new-item'), 'entries'); assert.equal(viewFromHash('#/entries'), 'entries');
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(EntryContent, { inventory: fixture('operador') })));
    assert.equal(host.querySelector('form'), null); assert.equal(host.querySelector('#input-nombre'), null);
    await type(host.querySelector('[type="search"]')!, 'MATERIAL'); await act(() => button(host, 'Seleccionar').click());
    assert.ok(button(host, 'Registrar entrada')); assert.equal(button(host, 'Guardar Componente'), undefined);
    await act(() => button(host, 'Quitar selección').click()); assert.equal(host.querySelector('form'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});
