import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { inventoryLocationValues, inventoryValues, formatCOP } from '../../src/domain/money';
import { mapAlmacen, mapCaja, mapElemento, mapEstanteria } from '../../src/data/mappers';
import { WarehouseTreeContent } from '../../src/components/warehouses/WarehouseTree';
import { LocationsManagerContent } from '../../src/components/administration/LocationsManager';
import { AdministrationNavigation, type AdministrationTab } from '../../src/components/administration/AdministrationNavigation';

const almacenes = [mapAlmacen({ id: 'w1', nombre: 'Norte' }), mapAlmacen({ id: 'w2', nombre: 'Sur' })];
const estanterias = [mapEstanteria({ id: 'r1', nombre: 'Rack Norte', almacen_id: 'w1' }), mapEstanteria({ id: 'r2', nombre: 'Rack Sur', almacen_id: 'w2' })];
const cajas = [mapCaja({ id: 'b1', codigo: 'Caja Norte', estanteria_id: 'r1' }), mapCaja({ id: 'b2', codigo: 'Caja vacía', estanteria_id: 'r1' })];
const product = (id: string, cantidad: number, price: number, extra = {}) => mapElemento({ id, nombre: id, cantidad,
  almacen_id: 'w1', estanteria_id: 'r1', caja_id: 'b1', especificaciones: { valor_unitario_cop: price }, ...extra });
const elementos = [
  product('boxed', 10, 100, { cantidad_danados: 2 }),
  product('rack only', 2.5, 50, { caja_id: null, cantidad_danados: 0.5 }),
  product('warehouse only', 3, 10, { estanteria_id: null, caja_id: null }),
  product('south', 2, 300, { almacen_id: 'w2', estanteria_id: 'r2', caja_id: null, cantidad_danados: 1 }),
  product('no location', 1, 99, { almacen_id: null, estanteria_id: null, caja_id: null }),
  product('archived', 999, 999, { archived: true }), product('pending', 999, 999, { stock_pendiente: true }),
];

test('location values include each product once per level, preserve unassigned stock and match dashboard amounts', () => {
  const values = inventoryLocationValues(elementos);
  assert.deepEqual(values.warehouses.get('w1'), { total: 1155, damaged: 225 });
  assert.deepEqual(values.warehouses.get('w2'), { total: 600, damaged: 300 });
  assert.deepEqual(values.racks.get('r1'), { total: 1125, damaged: 225 });
  assert.deepEqual(values.boxes.get('b1'), { total: 1000, damaged: 200 });
  assert.equal(values.boxes.has('b2'), false);
  assert.equal(values.warehouses.has(''), false);
  const dashboard = inventoryValues(elementos);
  for (const [id, summary] of values.warehouses) assert.equal(summary.total, dashboard.warehouses.get(id));
  assert.equal(dashboard.total, 1854);
  const capped = inventoryLocationValues([product('fractional', 0.001, 12.34, { cantidad_danados: 2 })]);
  assert.deepEqual(capped.boxes.get('b1'), { total: 0.01, damaged: 0.01 });
  assert.equal(inventoryLocationValues([]).warehouses.size, 0);
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const content = (markup: string) => new JSDOM(markup).window.document.body;
const assertValues = (node: Element, total: number, damaged: number) => {
  const amounts = [...node.querySelectorAll(':scope > dl dd')].map(element => element.textContent);
  assert.deepEqual(amounts, [formatCOP(total), formatCOP(damaged)]);
};

test('warehouse selection displays the selected total and damaged value plus nested rack/box values', () => {
  const props = { estanterias, niveles: [], cajas, elementos, canAdmin: false, onEditWarehouse() {}, onNewRack() {}, onEditRack() {},
    onNewLevel() {}, onEditLevel() {}, onNewBox() {}, onEditBox() {}, openItemDetail() {} };
  const north = content(renderToStaticMarkup(h(WarehouseTreeContent, { ...props, almacen: almacenes[0] })));
  assertValues(north.querySelector('section > div')!, 1155, 225);
  const rack = north.querySelector('article')!;
  assertValues(rack, 1125, 225);
  assertValues(rack.querySelector(':scope > div.grid > div')!, 1000, 200);
  assertValues(rack.querySelectorAll(':scope > div.grid > div')[1], 0, 0);
  const south = content(renderToStaticMarkup(h(WarehouseTreeContent, { ...props, almacen: almacenes[1] })));
  assertValues(south.querySelector('section > div')!, 600, 300);
  assert.equal(south.querySelectorAll('article').length, 1);
});

test('administration shows compact warehouse cards and financial values for racks and boxes, including empty boxes', async () => {
  const props = { almacenes, estanterias, niveles: [], cajas, elementos,
    user: { name: 'User', email: '', role: 'consulta', avatar: '' },
    getAlmacenById: (id: string | null | undefined) => almacenes.find(row => row.id === id),
    getEstanteriaById: (id: string | null | undefined) => estanterias.find(row => row.id === id) };
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(LocationsManagerContent, { ...props, kind: 'almacen' })));
    assert.equal(host.querySelectorAll('article').length, 2);
    assertValues(host.querySelector('article')!, 1155, 225);
    assertValues(host.querySelectorAll('article')[1], 600, 300);
    assert.match(host.textContent!, /Norte/); assert.match(host.textContent!, /Sur/);
    assert.doesNotMatch(host.textContent!, /Rack Norte|Caja Norte/);
    assert.equal(host.querySelector('button'), null);
    await act(() => root.render(h(LocationsManagerContent, { ...props, kind: 'almacen', user: { ...props.user, role: 'admin' } })));
    const createWarehouse = [...host.querySelectorAll<HTMLButtonElement>('button')].find(control => control.textContent === 'Crear almacén')!;
    assert.ok(createWarehouse); assert.equal(createWarehouse.disabled, false);
    assert.equal([...host.querySelectorAll('article button')].filter(control => control.textContent === 'Editar').length, 2);
    await act(() => root.render(h(LocationsManagerContent, { ...props, kind: 'estanteria' })));
    assertValues(host.querySelector('article')!, 1125, 225);
    assertValues(host.querySelectorAll('article')[1], 600, 300);
    await act(() => root.render(h(LocationsManagerContent, { ...props, kind: 'caja' })));
    assertValues(host.querySelector('article')!, 1000, 200);
    assertValues(host.querySelectorAll('article')[1], 0, 0);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('compact administration selector retains all nine icons and synchronizes warehouses and other sections with desktop buttons', async () => {
  function Navigation() { const [value, setValue] = useState<AdministrationTab>('codes'); return h(AdministrationNavigation, { value, onChange: setValue }); }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Navigation)));
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-icon'), 'tag');
    assert.ok(trigger.closest('.lg\\:hidden'));
    assert.ok(host.querySelector('[role="tablist"]')!.classList.contains('hidden'));
    for (const tab of host.querySelectorAll<HTMLButtonElement>('[role="tab"]')) assert.ok(tab.classList.contains('ui-flat-choice'));
    const desktopColors = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].map(tab => tab.querySelector<HTMLSpanElement>(':scope > span')!.style.color);
    assert.equal(host.querySelectorAll('[role="tab"] [data-filled="true"]').length, 1);
    assert.equal(new Set(desktopColors).size, 9); assert.ok(desktopColors.every(Boolean));
    await act(() => trigger.click());
    const list = document.querySelector('[role="listbox"]')!;
    assert.equal(list.querySelectorAll('[role="option"]').length, 9);
    assert.equal(list.querySelectorAll('[data-filled="true"]').length, 1);
    assert.deepEqual([...list.querySelectorAll('[data-icon]')].map(icon => icon.getAttribute('data-icon')), ['tag', 'category', 'warehouse', 'shelves', 'layers', 'inventory_2', 'folder_open', 'archive', 'settings']);
    assert.deepEqual([...list.querySelectorAll<HTMLSpanElement>('[role="option"] > span:first-child')].map(span => span.style.color), desktopColors);
    await act(() => list.querySelector<HTMLButtonElement>('[data-value="warehouses"]')!.click());
    assert.match(trigger.textContent!, /Almacenes/);
    assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-icon'), 'warehouse');
    assert.equal(trigger.querySelector<HTMLSpanElement>('.app-select-value')!.style.color, 'var(--ui-admin-warehouses)');
    assert.equal(host.querySelector('[role="tab"][aria-selected="true"]')!.id, 'data-tab-warehouses');
    for (const tab of host.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
      await act(() => tab.click());
      assert.equal(host.querySelectorAll('[role="tab"] [data-filled="true"]').length, 1);
      assert.equal(tab.querySelector('[data-icon]')!.getAttribute('data-filled'), 'true');
      assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-filled'), 'true');
      assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-icon'), tab.querySelector('[data-icon]')!.getAttribute('data-icon'));
    }
    await act(() => host.querySelector<HTMLButtonElement>('#data-tab-boxes')!.click());
    assert.match(trigger.textContent!, /Cajas/);
    assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-icon'), 'inventory_2');
    assert.equal(host.querySelector('[role="tab"][aria-selected="true"]')!.id, 'data-tab-boxes');
    await act(() => host.querySelector<HTMLButtonElement>('#data-tab-projects')!.click());
    assert.match(trigger.textContent!, /Proyectos/);
    assert.equal(trigger.querySelector('[data-icon]')!.getAttribute('data-icon'), 'folder_open');
  } finally { await act(() => root.unmount()); host.remove(); }
});
