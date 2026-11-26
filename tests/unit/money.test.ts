import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { mapAlmacen, mapElemento, mapRemision } from '../../src/data/mappers';
import { inventoryValues, roundCOP, validateUnitValue, formatCOP, MAX_UNIT_VALUE_COP } from '../../src/domain/money';
import { ItemValueField } from '../../src/components/item/ItemValueField';
import { ProjectInvestmentChart } from '../../src/components/dashboard/ProjectInvestmentChart';
import { WarehouseValueChart } from '../../src/components/dashboard/WarehouseValueChart';
import type { InventoryFilters } from '../../src/domain/explorer';

test('COP values validate zero and cents, and inventory valuation uses confirmed stock including damaged units', () => {
  for (const value of [0, 0.01, 12.34, MAX_UNIT_VALUE_COP]) assert.doesNotThrow(() => validateUnitValue(value));
  for (const value of [-1, NaN, Infinity, 1.001, MAX_UNIT_VALUE_COP + 1]) assert.throws(() => validateUnitValue(value));
  const item = (id: string, quantity: number, estado: string, price: number, extra = {}) => mapElemento({ id, cantidad: quantity,
    estado, almacen_id: id, especificaciones: { valor_unitario_cop: price }, ...extra });
  const summary = inventoryValues([
    item('a', 9, 'BUENO', 100), item('b', 4.5, 'MALO', 50), item('pending', 999, 'MALO', 999, { stock_pendiente: true }),
    item('archived', 999, 'MALO', 999, { archived: true }), item('zero', 12, 'BUENO', 0),
  ]);
  assert.equal(summary.total, 1125); assert.equal(summary.damaged, 225); assert.equal(summary.usable, 900); assert.equal(summary.damagedPercent, 20);
  assert.deepEqual([...summary.warehouses], [['a', 900], ['b', 225], ['zero', 0]]);
  assert.equal(inventoryValues([]).damagedPercent, 0);
  assert.equal(roundCOP(1.005), 1.01); assert.equal(roundCOP(0.001 * 12.34), 0.01);
  assert.match(formatCOP(1250.5), /COP/);
});
test('prices map from stored metadata and historical output snapshots independently of current inventory prices', () => {
  assert.equal(mapElemento({}).valorUnitario, 0);
  assert.equal(mapElemento({ especificaciones: { valor_unitario_cop: 12500.5 } }).valorUnitario, 12500.5);
  const saved = mapRemision({ items: [{ elementoId: 'a', cantidad: 2, valorUnitarioCOP: 12.5, valorTotalCOP: 25 }] });
  assert.equal(saved.items[0].valorUnitarioCOP, 12.5); assert.equal(saved.items[0].valorTotalCOP, 25);
  assert.equal(mapRemision({ items: [{ cantidad: 2 }] }).items[0].valorTotalCOP, 0);
});
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
test('the COP field lets users clear the default zero, enter cents and validates a missing or negative value', async () => {
  function Form() { const [value, setValue] = useState(0); return h('form', null, h(ItemValueField, { value, onChange: setValue, unit: 'MTS' })); }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    const input = host.querySelector('input')!;
    const type = (value: string) => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); };
    await act(() => type('')); assert.equal(input.value, ''); assert.equal(host.querySelector('form')!.checkValidity(), false);
    await act(() => type('12500.50')); assert.equal(input.value, '12500.50'); assert.equal(host.querySelector('form')!.checkValidity(), true);
    assert.match(host.textContent!, /COP/); assert.equal(host.querySelector('p'), null);
    await act(() => type('-1')); assert.equal(host.querySelector('form')!.checkValidity(), false);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('project investment chart renders stored costs, filters projects, expands details and shows loading/error', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let openedProjects = 0;
  const props = {
    projects: [
      { id: 'p', nombre: 'Proyecto Norte', cliente: 'Cliente Sol', ubicacion: 'Bogotá', estado: 'ACTIVO' as const, createdAt: '' },
      { id: 'z', nombre: 'Proyecto Vacío', cliente: 'Cliente Cero', ubicacion: 'Cali', estado: 'FINALIZADO' as const, createdAt: '' },
    ],
    spending: [{ proyectoId: 'p', totalCOP: 12500.5, salidas: 3 }],
    loading: false, error: false, onRetry: () => {}, onOpenProjects: () => { openedProjects++; },
  };
  const button = (pattern: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(btn => pattern.test(btn.textContent || ''))!;
  try {
    await act(() => root.render(h(ProjectInvestmentChart, props)));
    assert.match(host.textContent!, /Proyecto Norte/); assert.match(host.textContent!, /12\.500,5/);
    assert.doesNotMatch(host.textContent!, /Proyecto Vacío/, 'defaults to projects with investment');
    await act(() => button(/Todos/).click());
    assert.match(host.textContent!, /Proyecto Vacío/);
    await act(() => button(/Proyecto Norte/).click());
    assert.match(host.textContent!, /Cliente Sol/);
    await act(() => button(/Ir a Proyectos/).click());
    assert.equal(openedProjects, 1);

    await act(() => root.render(h(ProjectInvestmentChart, { ...props, spending: [], loading: true })));
    assert.ok(host.querySelector('[role="status"]')); assert.equal(host.querySelector('ul'), null);
    await act(() => root.render(h(ProjectInvestmentChart, { ...props, spending: [], error: true })));
    assert.ok(host.querySelector('[role="alert"]')); assert.equal(host.querySelector('ul'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('warehouse value chart sorts by value, toggles empty warehouses and opens filtered inventory on click', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const navigated: InventoryFilters[] = [];
  const warehouses = [
    mapAlmacen({ id: 'w-empty', nombre: 'Bodega Vacía', direccion: 'Cali' }),
    mapAlmacen({ id: 'w-main', nombre: 'Almacén Turpial', direccion: 'Bogotá' }),
  ];
  const items = [
    mapElemento({ id: 'i1', almacen_id: 'w-main', cantidad: 10, especificaciones: { valor_unitario_cop: 5000 } }),
  ];
  const button = (pattern: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(btn => pattern.test(btn.textContent || ''))!;
  try {
    await act(() => root.render(h(WarehouseValueChart, {
      items, warehouses, warehouseScope: 'ALL',
      onOpenInventory: (filters: InventoryFilters) => { navigated.push(filters); },
    })));
    assert.match(host.textContent!, /Almacén Turpial/);
    assert.doesNotMatch(host.textContent!, /Bodega Vacía/, 'defaults to warehouses with value');
    await act(() => button(/Todos/).click());
    assert.match(host.textContent!, /Bodega Vacía/);
    await act(() => button(/Almacén Turpial/).click());
    assert.equal(navigated.length, 1);
    assert.equal(navigated[0].warehouseId, 'w-main');
  } finally { await act(() => root.unmount()); host.remove(); }
});
