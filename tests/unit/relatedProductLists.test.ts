import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { HistoryTableContent } from '../../src/components/history/HistoryTable';
import { WarehouseTreeContent } from '../../src/components/warehouses/WarehouseTree';
import { mapElemento, mapAlmacen, mapEstanteria, mapNivel, mapCaja } from '../../src/data/mappers';
import type { Elemento, HistorialMovimiento } from '../../src/types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const item = mapElemento({ id: 'M1', codigo: 'MAT001', nombre: 'Nombre actual', cantidad: 12, unidad: 'UND' });
const movement: HistorialMovimiento = { id: 'H1', tipo: 'SALIDA', elementoId: item.id, itemCode: 'MAT001', itemName: 'Nombre histórico',
  cantidad: 1, unidad: 'UND', stockAnterior: 12, stockNuevo: 11, motivo: 'Remisión registrada', responsable: 'Persona', fecha: '7 Oct 2026', hora: '10:00', remisionId: 'REM1' };
const click = async (target: HTMLElement) => { await act(() => target.click()); };

async function withHistory(check: (host: HTMLElement, opened: Elemento[], documents: string[]) => Promise<void>) {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const opened: Elemento[] = [], documents: string[] = [];
  try {
    await act(() => root.render(h(HistoryTableContent, { rows: [movement, { ...movement, id: 'H2', elementoId: 'removed' }], total: 2, page: 1, pages: 1,
      loading: false, onPage: () => {}, onDocument: id => documents.push(`pdf:${id}`), inventory: { elementos: [item], proyectos: [],
        openItemDetail: item => { opened.push(item); }, openOutgoingPhotos: id => { documents.push(`photos:${id}`); } } })));
    await check(host, opened, documents);
  } finally { document.getSelection()?.removeAllRanges(); await act(() => root.unmount()); host.remove(); }
}

test('history opens from the complete movement surface and its native name button without changing historical snapshots', async () => {
  await withHistory(async (host, opened) => {
    const row = host.querySelector<HTMLElement>('[data-movement-id="H1"]')!;
    const cells = row.querySelectorAll<HTMLElement>('td');
    for (const target of [row, cells[1], cells[2], cells[3].querySelector<HTMLElement>('span')!, cells[5], cells[7]]) await click(target);
    assert.equal(opened.length, 6); assert.ok(opened.every(value => value === item));
    const name = row.querySelector<HTMLButtonElement>('.ui-product-open')!;
    name.focus(); assert.equal(document.activeElement, name); await click(name); assert.equal(opened.length, 7);
    assert.equal(name.textContent, 'Nombre histórico'); assert.match(row.textContent!, /11 UND/);
    assert.doesNotMatch(row.textContent!, /Nombre actual/); assert.equal(cells[2].querySelector('button'), null);
  });
});

test('history documents remain independent, copying text does not open details, and deleted products remain readable', async () => {
  await withHistory(async (host, opened, documents) => {
    const row = host.querySelector<HTMLElement>('[data-movement-id="H1"]')!;
    await click(row.querySelector<HTMLButtonElement>('[aria-label="Ver remisión PDF"]')!);
    await click(row.querySelector<HTMLElement>('[aria-label="Ver fotografías de la salida"] span')!);
    assert.deepEqual(documents, ['pdf:REM1', 'photos:REM1']); assert.equal(opened.length, 0);
    const selection = document.getSelection()!, range = document.createRange();
    range.selectNodeContents(row.querySelector('.ui-product-open')!); selection.addRange(range);
    await click(row); assert.equal(opened.length, 0); selection.removeAllRanges();
    const removed = host.querySelector<HTMLElement>('[data-movement-id="H2"]')!;
    await click(removed); assert.equal(opened.length, 0); assert.match(removed.textContent!, /Nombre histórico/);
    assert.equal(removed.querySelector('.ui-product-open'), null);
    await click(removed.querySelector<HTMLButtonElement>('[aria-label="Ver remisión PDF"]')!);
    assert.equal(documents.at(-1), 'pdf:REM1');
  });
});

test('warehouse products use a complete clickable surface in boxes, levels, loose racks and unassigned storage', async () => {
  const warehouse = mapAlmacen({ id: 'W1', nombre: 'Almacén' }), rack = mapEstanteria({ id: 'R1', almacen_id: 'W1', nombre: 'Estante' });
  const level = mapNivel({ id: 'L1', estanteria_id: 'R1', codigo: 'N1', nombre: 'Superior' });
  const box = mapCaja({ id: 'B1', estanteria_id: 'R1', nivel_id: 'L1', codigo: 'Caja' });
  const items = [
    { ...item, almacenId: 'W1', estanteriaId: 'R1', nivelId: 'L1', cajaId: 'B1' },
    { ...item, id: 'M2', almacenId: 'W1', estanteriaId: 'R1', nivelId: 'L1' },
    { ...item, id: 'M3', almacenId: 'W1', estanteriaId: 'R1' },
    { ...item, id: 'M4', almacenId: 'W1' },
  ];
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host), opened: Elemento[] = [];
  try {
    await act(() => root.render(h(WarehouseTreeContent, { almacen: warehouse, estanterias: [rack], niveles: [level], cajas: [box], elementos: items, canAdmin: false,
      onEditWarehouse() {}, onNewRack() {}, onEditRack() {}, onNewLevel() {}, onEditLevel() {}, onNewBox() {}, onEditBox() {}, openItemDetail: item => opened.push(item) })));
    for (const product of items) {
      const surface = host.querySelector<HTMLElement>(`[data-product-id="${product.id}"]`)!;
      assert.ok(surface.classList.contains('ui-product-line'));
      for (const target of [surface, surface.querySelector<HTMLElement>('span')!, surface.querySelector<HTMLButtonElement>('button')!]) await click(target);
      assert.ok(opened.slice(-3).every(value => value === product));
    }
    assert.equal(opened.length, 12);
  } finally { await act(() => root.unmount()); host.remove(); }
});
