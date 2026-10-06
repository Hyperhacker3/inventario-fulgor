import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { ExplorerFilters } from '../../src/components/explorer/ExplorerFilters';
import { emptyInventoryFilters, changeWarehouse, changeRack, filterInventory, locationChoices, ALL_LOCATIONS, NO_LOCATION } from '../../src/domain/explorer';
import { mapElemento } from '../../src/data/mappers';
import type { Almacen, Estanteria, Caja, Elemento } from '../../src/types';

const warehouses: Almacen[] = ['Norte', 'Sur'].map((nombre, index) => ({ id: `w${index + 1}`, nombre, codigo: nombre, ciudad: '', capacidadPorcentaje: 0, estado: 'Operativo' }));
const racks: Estanteria[] = [
  { id: 'r1', almacenId: 'w1', nombre: 'Estante A', codigo: 'A' },
  { id: 'r2', almacenId: 'w1', nombre: 'Estante B', codigo: 'B' },
  { id: 'r3', almacenId: 'w2', nombre: 'Estante A', codigo: 'A' },
];
const boxes: Caja[] = [
  { id: 'b1', estanteriaId: 'r1', codigoCaja: 'Caja 1', estado: 'Completa' },
  { id: 'b2', estanteriaId: 'r2', codigoCaja: 'Caja 2', estado: 'Completa' },
  { id: 'b3', estanteriaId: 'r3', codigoCaja: 'Caja 1', estado: 'Completa' },
  { id: 'b4', estanteriaId: null, codigoCaja: 'Suelta', estado: 'Vacia' },
];
const base = mapElemento({ id: 'one', codigo: 'CAB001', nombre: 'Cable', cantidad: 8, categoria: 'CABLES', stock_minimo: 3 });
const items: Elemento[] = [
  { ...base, id: 'one', almacenId: 'w1', estanteriaId: 'r1', cajaId: 'b1' },
  { ...base, id: 'two', codigo: 'TOR001', nombre: 'Tornillo', categoria: 'NUEVA_CATEGORIA', cantidad: 2, stockMinimo: 3, almacenId: 'w1', estanteriaId: 'r2', cajaId: 'b2' },
  { ...base, id: 'three', almacenId: 'w2', estanteriaId: 'r3', cajaId: 'b3' },
  { ...base, id: 'four', cantidad: 0, almacenId: 'w1', estanteriaId: null, cajaId: null },
];
const location = (item: Elemento) => item.almacenId === 'w1' ? 'Norte' : 'Sur';
const ids = (result: Elemento[]) => result.map(item => item.id);

test('categories use inclusive multi-selection and intersect with stock, search and each location level', () => {
  const defaults = emptyInventoryFilters();
  assert.deepEqual(ids(filterInventory(items, defaults, '', location)), ['one', 'two', 'three', 'four']);
  assert.deepEqual(ids(filterInventory(items, { ...defaults, categories: ['NUEVA_CATEGORIA'] }, '', location)), ['two']);
  const multi = { ...defaults, categories: ['CABLES', 'NUEVA_CATEGORIA'], warehouseId: 'w1' };
  assert.deepEqual(ids(filterInventory(items, multi, '', location)), ['one', 'two', 'four']);
  assert.deepEqual(ids(filterInventory(items, { ...multi, rackId: 'r1', boxId: 'b1' }, '', location)), ['one']);
  assert.deepEqual(ids(filterInventory(items, { ...multi, rackId: 'r1', boxId: 'b2' }, '', location)), []);
  assert.deepEqual(ids(filterInventory(items, { ...multi, stock: 'bajo' }, '', location)), ['two']);
  assert.deepEqual(ids(filterInventory(items, multi, ' tor001 ', location)), ['two']);
  assert.deepEqual(ids(filterInventory(items, defaults, 'sur', location)), ['three']);
});

test('rack and box filters also work across warehouses and include unassigned materials', () => {
  const defaults = emptyInventoryFilters();
  assert.deepEqual(ids(filterInventory(items, { ...defaults, rackId: 'r3' }, '', location)), ['three']);
  assert.deepEqual(ids(filterInventory(items, { ...defaults, boxId: 'b2' }, '', location)), ['two']);
  assert.deepEqual(ids(filterInventory(items, { ...defaults, rackId: NO_LOCATION }, '', location)), ['four']);
  assert.deepEqual(ids(filterInventory(items, { ...defaults, boxId: NO_LOCATION }, '', location)), ['four']);
});

test('location choices follow the hierarchy and parent changes clear incompatible child filters', () => {
  assert.equal(locationChoices(racks, boxes, ALL_LOCATIONS, ALL_LOCATIONS).boxes.length, 4);
  const north = locationChoices(racks, boxes, 'w1', ALL_LOCATIONS);
  assert.deepEqual(north.racks.map(rack => rack.id), ['r1', 'r2']);
  assert.deepEqual(north.boxes.map(box => box.id), ['b1', 'b2']);
  assert.deepEqual(locationChoices(racks, boxes, 'w1', 'r1').boxes.map(box => box.id), ['b1']);
  assert.deepEqual(locationChoices(racks, boxes, 'w1', 'r3').boxes, []);
  assert.deepEqual(locationChoices(racks, boxes, 'w1', NO_LOCATION).boxes, []);
  const selected = { ...emptyInventoryFilters(), warehouseId: 'w1', rackId: 'r1', boxId: 'b1', categories: ['CABLES'] };
  assert.deepEqual(changeWarehouse(selected, 'w2'), { ...selected, warehouseId: 'w2', rackId: ALL_LOCATIONS, boxId: ALL_LOCATIONS });
  assert.deepEqual(changeRack(selected, 'r2'), { ...selected, rackId: 'r2', boxId: ALL_LOCATIONS });
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const categoryLabel = (id: string) => id === 'CABLES' ? 'Cables' : 'Nueva categoría';
function FilterPanel() {
  const [filters, setFilters] = useState(emptyInventoryFilters);
  return h(ExplorerFilters, { visible: true, filters, warehouses, racks, boxes, categories: ['CABLES', 'NUEVA_CATEGORIA'], categoryLabel,
    onCategories: categories => setFilters(prev => ({ ...prev, categories })), onStock: stock => setFilters(prev => ({ ...prev, stock })),
    onWarehouse: id => setFilters(prev => changeWarehouse(prev, id)), onRack: id => setFilters(prev => changeRack(prev, id)),
    onBox: boxId => setFilters(prev => ({ ...prev, boxId })), onClear: () => setFilters(emptyInventoryFilters()) });
}
const choose = async (id: string, value: string) => {
  await act(() => (document.getElementById(id) as HTMLButtonElement).click());
  const list = document.getElementById(`${id}-options`)!;
  const target = [...list.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(option => option.dataset.value === value)!;
  assert.ok(target); await act(() => target.click());
};
const selectedValue = (id: string) => (document.getElementById(`${id}-value`) as HTMLSelectElement).value;
const optionValues = (id: string) => [...(document.getElementById(`${id}-value`) as HTMLSelectElement).options].map(option => option.value);

test('the styled category picker adds several categories, prevents duplicates and lets users remove and clear them', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(FilterPanel)));
    assert.equal(host.querySelectorAll('input[type="checkbox"]').length, 0);
    assert.match(host.textContent!, /Todas las categorías/);
    await choose('inventory-category-filter', 'CABLES');
    assert.deepEqual(optionValues('inventory-category-filter'), ['', 'NUEVA_CATEGORIA']);
    await choose('inventory-category-filter', 'NUEVA_CATEGORIA');
    assert.equal(host.querySelectorAll('ul[aria-label="Categorías del filtro"] li').length, 2);
    assert.equal((document.getElementById('inventory-category-filter') as HTMLButtonElement).disabled, true);
    await act(() => host.querySelector<HTMLButtonElement>('[aria-label="Quitar categoría Cables"]')!.click());
    assert.deepEqual(optionValues('inventory-category-filter'), ['', 'CABLES']);
    assert.equal((document.getElementById('inventory-category-filter') as HTMLButtonElement).disabled, false);
    await act(() => host.querySelector<HTMLButtonElement>('#btn-clear-filters')!.click());
    assert.equal(host.querySelector('ul[aria-label="Categorías del filtro"]'), null);
    assert.match(host.textContent!, /Todas las categorías/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('warehouse, rack and box controls offer compatible choices and clearing restores every filter', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(FilterPanel)));
    await choose('inventory-warehouse-filter', 'w1');
    assert.deepEqual(optionValues('inventory-rack-filter'), [ALL_LOCATIONS, NO_LOCATION, 'r1', 'r2']);
    assert.deepEqual(optionValues('inventory-box-filter'), [ALL_LOCATIONS, NO_LOCATION, 'b1', 'b2']);
    await choose('inventory-rack-filter', 'r1'); await choose('inventory-box-filter', 'b1');
    await choose('inventory-rack-filter', 'r2');
    assert.equal(selectedValue('inventory-box-filter'), ALL_LOCATIONS);
    assert.deepEqual(optionValues('inventory-box-filter'), [ALL_LOCATIONS, NO_LOCATION, 'b2']);
    await choose('inventory-warehouse-filter', 'w2');
    assert.equal(selectedValue('inventory-rack-filter'), ALL_LOCATIONS);
    assert.deepEqual(optionValues('inventory-rack-filter'), [ALL_LOCATIONS, NO_LOCATION, 'r3']);
    await act(() => host.querySelector<HTMLButtonElement>('#btn-clear-filters')!.click());
    for (const field of ['warehouse', 'rack', 'box']) assert.equal(selectedValue(`inventory-${field}-filter`), ALL_LOCATIONS);
  } finally { await act(() => root.unmount()); host.remove(); }
});
