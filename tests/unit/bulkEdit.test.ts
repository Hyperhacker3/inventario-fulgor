import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { mapAlmacen, mapCaja, mapElemento, mapEstanteria, mapNivel } from '../../src/data/mappers';
import { applyBulkChanges, BulkArchiveRequests, BulkEditRequests, bulkChangesPayload, changeSelection, prepareBulkDispatch, sharedLocation, sharedValue,
  validateBulkArchive, validateBulkChanges, validateBulkLocation, type BulkItemChanges } from '../../src/domain/bulkEdit';
import type { Elemento } from '../../src/types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const { ExplorerResultsContent } = await import('../../src/components/explorer/ExplorerResults');
const { BulkEditDialog } = await import('../../src/components/explorer/BulkEditDialog');
const { BulkDispatchDialog } = await import('../../src/components/explorer/BulkDispatchDialog');
const { BulkArchiveDialog } = await import('../../src/components/explorer/BulkArchiveDialog');

const item = (index: number, extra: Record<string, unknown> = {}) => mapElemento({ id: `item-${index}`, codigo: `MAT00${index}`, nombre: `Material ${index}`,
  categoria: 'OTROS', cantidad: 12, stock_minimo: index, unidad: 'UND', estado: 'BUENO', almacen_id: 'W', estanteria_id: 'R',
  especificaciones: { marca: 'ACME', valor_unitario_cop: 1500, peso_unitario: { valor: 2, unidad: 'kg' } }, ...extra });
const items = [item(1), item(2)];
const warehouses = [mapAlmacen({ id: 'W', codigo: 'ALM001', nombre: 'Bodega' }), mapAlmacen({ id: 'W2', codigo: 'ALM002', nombre: 'Otra' })];
const racks = [mapEstanteria({ id: 'R', codigo: 'EST001', nombre: 'Estante', almacen_id: 'W' })];
const levels = [mapNivel({ id: 'N', codigo: 'NIV001', nombre: 'Superior', estanteria_id: 'R' })];
const boxes = [mapCaja({ id: 'B', codigo: 'CAJ001', estanteria_id: 'R', nivel_id: 'N' })];

test('bulk changes send only the chosen shared data and validate them before Supabase', () => {
  assert.deepEqual(bulkChangesPayload({ marca: '  acme  ', estado: 'en reparacion' }), { estado: 'EN REPARACIÓN', marca: 'acme' });
  assert.deepEqual(bulkChangesPayload({ stockMinimo: 0, ubicacion: { warehouseId: 'W', rackId: 'R', levelId: '', boxId: '' } }),
    { stock_minimo: 0, ubicacion: { almacen_id: 'W', estanteria_id: 'R', nivel_id: null, caja_id: null } });
  assert.deepEqual(bulkChangesPayload({ marca: '' }), { marca: '' }, 'an empty brand clears it');
  const invalid: [string[], BulkItemChanges, RegExp][] = [[[], { estado: 'MALO' }, /al menos un producto/], [['a'], {}, /al menos un dato/],
    [['a'], { categoria: ' ' }, /categoría/], [['a'], { estado: 'NUEVO' }, /estado válido/], [['a'], { stockMinimo: -1 }, /no negativo/],
    [['a'], { stockMinimo: 1.0005 }, /tres decimales/], [['a'], { marca: 'x'.repeat(101) }, /100 caracteres/],
    [['a'], { ubicacion: { warehouseId: '', rackId: 'R', levelId: '', boxId: '' } }, /almacén/],
    [['a'], { ubicacion: { warehouseId: 'W', rackId: '', levelId: '', boxId: 'B' } }, /estantería/],
    [Array.from({ length: 5001 }, (_, index) => `id-${index}`), { estado: 'MALO' }, /5\.000/]];
  for (const [ids, changes, message] of invalid) assert.throws(() => validateBulkChanges(ids, changes), message);
  assert.doesNotThrow(() => validateBulkChanges(['a'], { estado: 'REGULAR', stockMinimo: 2.5 }));
  validateBulkLocation({ warehouseId: 'W', rackId: 'R', levelId: 'N', boxId: 'B' }, warehouses, racks, levels, boxes);
  assert.throws(() => validateBulkLocation({ warehouseId: 'W2', rackId: 'R', levelId: '', boxId: '' }, warehouses, racks, levels, boxes), /no pertenece al almacén/);
  assert.throws(() => validateBulkLocation({ warehouseId: 'W', rackId: 'R', levelId: '', boxId: 'B' }, warehouses, racks, levels, boxes), /caja no pertenece/);
});

test('bulk changes preserve every unchosen field, shared values prefill and retries reuse the request', () => {
  const changed = applyBulkChanges(items[0], { categoria: 'CABLES', marca: 'nueva marca' }, 'now');
  assert.deepEqual({ ...changed, categoria: items[0].categoria, marca: items[0].marca, updatedAt: items[0].updatedAt }, items[0]);
  assert.equal(changed.marca, 'NUEVA MARCA');
  assert.equal(sharedValue(items, row => row.marca), 'ACME');
  assert.equal(sharedValue(items, row => row.stockMinimo), undefined);
  assert.deepEqual(sharedLocation(items), { warehouseId: 'W', rackId: 'R', levelId: '', boxId: '' });
  assert.deepEqual(changeSelection(['a', 'b'], ['b', 'c'], true), ['a', 'b', 'c']);
  assert.deepEqual(changeSelection(['a', 'b'], ['b', 'x'], false), ['a']);
  const requests = new BulkEditRequests(); let next = 0; const newId = () => `request-${++next}`;
  const first = requests.requestFor(['b', 'a'], { estado: 'MALO' }, newId);
  assert.equal(requests.requestFor(['a', 'b', 'a'], { estado: 'MALO' }, newId), first, 'an uncertain retry keeps the same request');
  assert.notEqual(requests.requestFor(['a', 'b'], { estado: 'REGULAR' }, newId), first, 'other data needs a new request');
  const changedId = requests.requestFor(['a', 'b'], { estado: 'REGULAR' }, newId); requests.confirm();
  assert.notEqual(requests.requestFor(['a', 'b'], { estado: 'REGULAR' }, newId), changedId, 'a confirmed edit is not replayed');
});

async function render(element: ReturnType<typeof h>, check: (host: HTMLElement, rerender: (next: ReturnType<typeof h>) => Promise<void>) => Promise<void>) {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try { await act(() => root.render(element)); await check(host, async next => { await act(() => root.render(next)); }); }
  finally { await act(() => root.unmount()); host.remove(); }
}
const inventory = (opened: Elemento[]) => ({ user: { name: 'Admin', email: 'admin@app.test', role: 'admin' as const, avatar: '' },
  openItemDetail: (row: Elemento) => { opened.push(row); }, addToDispatchCart: () => {}, categoryLabel: () => 'Otros',
  getAlmacenById: () => undefined });

test('selection mode toggles products from their surface or checkbox while the name still opens the detail', async () => {
  for (const mode of ['grid', 'list'] as const) {
    const opened: Elemento[] = [], toggles: [string, boolean][] = [];
    const props = (ids: string[], disabled = false) => ({ items, mode, inventory: inventory(opened),
      selection: { ids: new Set(ids), disabled, onToggle: (row: Elemento, selected: boolean) => { toggles.push([row.id, selected]); } } });
    await render(h(ExplorerResultsContent, props([])), async (host, rerender) => {
      const surface = (row: Elemento) => host.querySelector<HTMLElement>(`[data-product-id="${row.id}"]`)!;
      const box = (row: Elemento) => host.querySelector<HTMLInputElement>(`input[aria-label^="Seleccionar ${row.codigo}"]`)!;
      assert.ok(box(items[0]) && box(items[1]), `${mode}: every product has a checkbox`);
      await act(() => surface(items[0]).click());
      await act(() => box(items[1]).click());
      await act(() => box(items[1]).closest('label')!.click());
      assert.deepEqual(toggles, [['item-1', true], ['item-2', true], ['item-2', true]], `${mode}: one toggle per click, also through the label`);
      assert.equal(opened.length, 0);
      await act(() => host.querySelector<HTMLButtonElement>(`button[aria-label="Ver detalles de ${items[0].codigo} · ${items[0].nombre}"]`)!.click());
      assert.deepEqual(opened.map(row => row.id), ['item-1'], `${mode}: the name opens the detail`);
      await rerender(h(ExplorerResultsContent, props(['item-1'])));
      assert.equal(surface(items[0]).dataset.selected, 'true'); assert.equal(surface(items[1]).dataset.selected, 'false');
      assert.equal(box(items[0]).checked, true);
      await act(() => surface(items[0]).click());
      assert.deepEqual(toggles.at(-1), ['item-1', false]);
      await rerender(h(ExplorerResultsContent, props(['item-1'], true)));
      const count = toggles.length; await act(() => surface(items[1]).click());
      assert.equal(toggles.length, count, `${mode}: a pending edit locks the selection`); assert.equal(box(items[1]).disabled, true);
      await rerender(h(ExplorerResultsContent, { items, mode, inventory: inventory(opened) }));
      assert.equal(host.querySelector('input[type="checkbox"]'), null, `${mode}: no checkboxes outside selection mode`);
      assert.equal(surface(items[0]).dataset.selected, undefined);
      await act(() => surface(items[1]).click());
      assert.deepEqual(opened.map(row => row.id), ['item-1', 'item-2'], `${mode}: the surface opens the detail outside selection mode`);
    });
  }
});

const typeText = async (input: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
});
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(row => row.textContent === label)!;

test('bulk edit dialog sends only marked data, keeps the form on errors and blocks duplicates and closing while saving', async () => {
  const calls: { ids: string[]; changes: BulkItemChanges; requestId: string }[] = [];
  let fail = true, finish!: () => void; const saved: number[] = []; let closed = 0;
  const save = async (ids: string[], changes: BulkItemChanges, requestId: string) => {
    calls.push({ ids, changes, requestId });
    if (fail) throw new Error('Respuesta desconocida');
    await new Promise<void>(resolve => { finish = resolve; });
    return items;
  };
  await render(h(BulkEditDialog, { items, categories: [{ id: 'OTROS', label: 'Otros' }, { id: 'CABLES', label: 'Cables' }],
    warehouses, racks, levels, boxes, save, onClose: () => { closed++; }, onSaved: (count: number) => { saved.push(count); } }), async () => {
    const field = (name: string) => document.querySelector<HTMLFieldSetElement>(`[data-bulk-field="${name}"]`)!;
    const toggle = (name: string) => field(name).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const brand = field('marca').querySelector<HTMLInputElement>('input:not([type="checkbox"])')!;
    assert.match(document.querySelector('[role="dialog"]')!.textContent!, /Editar 2 productos/);
    assert.equal(button('Guardar cambios').disabled, true, 'nothing is marked yet');
    assert.equal(brand.value, 'ACME'); assert.equal(brand.disabled, true);
    assert.doesNotMatch(field('marca').textContent!, /valores distintos/); assert.match(field('stockMinimo').textContent!, /valores distintos/);
    assert.doesNotMatch(document.body.textContent!, /Cantidad|Unidad de medida|Valor por/, 'quantities, units, prices and weights are not offered');
    await act(() => toggle('marca').click());
    assert.equal(brand.disabled, false);
    await typeText(brand, 'nueva marca');
    assert.match(document.body.textContent!, /Se cambiará marca en 2 productos/);
    await act(async () => { button('Guardar cambios').click(); });
    assert.match(document.querySelector('[role="alert"]')!.textContent!, /Respuesta desconocida/);
    assert.equal(brand.value, 'nueva marca', 'the draft survives an error');
    assert.deepEqual(calls[0].ids, ['item-1', 'item-2']); assert.deepEqual(calls[0].changes, { marca: 'nueva marca' });
    fail = false;
    const submit = button('Guardar cambios');
    await act(async () => { submit.click(); submit.click(); });
    assert.equal(calls.length, 2, 'a double click sends one request');
    assert.equal(calls[1].requestId, calls[0].requestId, 'the retry reuses the uncertain request');
    assert.equal(button('Cancelar').disabled, true);
    await act(() => { document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(closed, 0, 'Escape does not close while saving');
    await act(async () => finish());
    assert.deepEqual(saved, [2]);
  });
});

test('bulk dispatch dialog separates unavailable products, supports 1 c/u and Todo disponible, and confirms chosen lines', async () => {
  const zero = item(3, { cantidad: 0 });
  const inCart = [{ elemento: items[0], cantidad: 10 }];
  const { availableRows, unavailableRows } = prepareBulkDispatch([items[0], items[1], zero], inCart);
  assert.deepEqual(availableRows.map(r => [r.item.id, r.maxAdd]), [['item-1', 2], ['item-2', 12]]);
  assert.deepEqual(unavailableRows.map(r => r.item.id), ['item-3']);

  const confirmed: { elemento: Elemento; cantidad: number }[][] = [];
  await render(h(BulkDispatchDialog, {
    items: [items[0], items[1], zero],
    cart: inCart,
    cartLocked: false,
    onConfirm: lines => { confirmed.push(lines); },
    onClose: () => {},
  }), async () => {
    assert.match(document.body.textContent!, /1 producto sin stock disponible/);
    await act(() => button('Todo disponible').click());
    await act(() => button('Agregar a la salida (2)').click());
    assert.equal(confirmed.length, 1);
    assert.deepEqual(confirmed[0].map(l => [l.elemento.id, l.cantidad]), [['item-1', 2], ['item-2', 12]]);
  });
});

test('bulk archive dialog blocks borrowed items, reuses UUID on retry and prevents closing while pending', async () => {
  assert.throws(() => validateBulkArchive([]), /al menos un producto/);
  const reqs = new BulkArchiveRequests();
  let seq = 0; const next = () => `arch-${++seq}`;
  const first = reqs.requestFor(['b', 'a'], next);
  assert.equal(reqs.requestFor(['a', 'b', 'a'], next), first);
  reqs.confirm();
  assert.notEqual(reqs.requestFor(['a', 'b'], next), first);

  const borrowedItem = item(4, { cantidad_prestada: 2 });
  await render(h(BulkArchiveDialog, {
    items: [items[0], borrowedItem],
    archive: async () => [],
    onClose: () => {},
    onArchived: () => {},
  }), async () => {
    assert.match(document.querySelector('[role="alert"]')!.textContent!, /préstamos internos/);
    assert.equal(button('Archivar (2)').disabled, true);
  });

  const calls: { ids: string[]; requestId: string }[] = [];
  const archived: string[][] = [];
  let fail = true, finish!: () => void, closed = 0;
  const archive = async (ids: string[], requestId: string) => {
    calls.push({ ids, requestId });
    if (fail) throw new Error('Sin respuesta');
    await new Promise<void>(resolve => { finish = resolve; });
    return ids;
  };
  await render(h(BulkArchiveDialog, {
    items,
    archive,
    onClose: () => { closed++; },
    onArchived: ids => { archived.push(ids); },
  }), async () => {
    await act(async () => { button('Archivar (2)').click(); });
    assert.match(document.querySelector('[role="alert"]')!.textContent!, /Sin respuesta/);
    fail = false;
    const confirmBtn = button('Archivar (2)');
    await act(async () => { confirmBtn.click(); confirmBtn.click(); });
    assert.equal(calls.length, 2, 'double click sends one request');
    assert.equal(calls[1].requestId, calls[0].requestId, 'retry reuses the UUID');
    await act(() => { document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(closed, 0, 'Escape cannot close while archiving');
    await act(async () => finish());
    assert.deepEqual(archived, [['item-1', 'item-2']]);
  });
});
