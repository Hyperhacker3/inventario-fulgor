import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, Fragment, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildInventoryReport, reportQuantities, selectReportItems, type InventoryReport, type ReportFilters } from '../../src/domain/inventoryReport';
import { readReportItems } from '../../src/data/inventoryReport';
import { mapAlmacen, mapCaja, mapElemento, mapEstanteria, mapNivel } from '../../src/data/mappers';
import { DEFAULT_COMPANY } from '../../src/domain/company';
import { InventoryReportsManager } from '../../src/components/InventoryReportsView';
import { InventoryReportHeader, InventoryReportTable, InventoryReportSummary } from '../../src/components/reports/InventoryReportSections';
import { paginateRemission } from '../../src/domain/remissionLayout';
import { viewFromHash } from '../../src/state/useViewNavigation';

const product = (id: string, quantity = 2, unit = 'und', price = 100, patch: Record<string, unknown> = {}) => mapElemento({
  id, codigo: `MAT${id}`, nombre: 'Material repetido', cantidad: quantity, unidad: unit, almacen_id: 'a', estanteria_id: 'r', nivel_id: 'l', caja_id: 'b',
  cantidad_danados: Math.min(1, quantity), especificaciones: { marca: 'Marca', peso_unitario: { valor: 250, unidad: 'g' }, valor_unitario_cop: price }, ...patch,
});
const locations = {
  warehouses: [mapAlmacen({ id: 'a', nombre: 'Almacén Honda' })], racks: [mapEstanteria({ id: 'r', nombre: 'Estante Uno' })],
  levels: [mapNivel({ id: 'l', nombre: 'Superior' })], boxes: [mapCaja({ id: 'b', codigo: 'CAJA-1' })],
};
const now = new Date('2026-10-28T15:00:00Z');
const build = (items: ReturnType<typeof product>[], ids = items.map(item => item.id)) => buildInventoryReport(items, ids, locations, DEFAULT_COMPANY, 'Persona autorizada', now);

test('reports preserve separate products and full stock including damage, group units and snapshot quantities, values, weights and locations', () => {
  const items = [product('1', 2), product('2', 1.25, 'mts', 10.2), product('3', 0.1, 'und', 0.5)];
  const report = build(items, ['1', '2', '3', '1']);
  assert.equal(report.rows.length, 3); assert.equal(report.rows[0].quantity, 2); assert.equal(report.rows[0].damaged, 1);
  assert.equal(report.rows[0].weightKg, 0.5); assert.equal(report.rows[1].weightKg, 0.3125);
  assert.equal(report.weightKg, 0.8375); assert.equal(report.valueCOP, 212.8);
  assert.deepEqual(report.quantities, [{ unit: 'MTS', quantity: 1.25 }, { unit: 'UND', quantity: 2.1 }]);
  assert.match(reportQuantities(report), /1,25 MTS.*2,1 UND/);
  assert.equal(report.rows[0].location, 'Almacén Honda > Estante Uno > Nivel Superior > CAJA-1');
  const before = structuredClone(report);
  items[0].cantidad = 999; items[0].pesoUnitario!.valor = 999; locations.warehouses[0].nombre = 'Nombre actual';
  assert.deepEqual(report, before); locations.warehouses[0].nombre = 'Almacén Honda';
  assert.equal(viewFromHash('#/reports'), 'reports');
});

test('reports keep pending stock and missing weights explicit, preserve declared zero values and reject unavailable selections', () => {
  const pending = product('p', 999, 'und', 50, { stock_pendiente: true });
  const noWeight = product('n', 3, 'und', 0, { especificaciones: { valor_unitario_cop: 0 } });
  const report = build([pending, noWeight]);
  assert.equal(report.pendingQuantity, 1); assert.equal(report.pendingWeight, 2); assert.equal(report.pendingValue, 1);
  assert.equal(report.rows.find(row => row.id === 'p')!.quantity, null);
  assert.equal(report.rows.find(row => row.id === 'p')!.valueCOP, null);
  assert.deepEqual(report.quantities, [{ unit: 'UND', quantity: 3 }]); assert.equal(report.valueCOP, 0); assert.equal(report.zeroPrice, 1);
  const markup = renderToStaticMarkup(h(InventoryReportSummary, { report }));
  assert.match(markup, /Sin peso total verificable/); assert.match(markup, /Valor unitario en cero/);
  assert.throws(() => build([pending], []), /Seleccione/);
  assert.throws(() => build([pending], ['missing']), /no disponibles/);
  assert.throws(() => build([product('a', 1, 'und', 1, { archived: true })]), /no disponibles/);
});

test('report selection keeps choices across result pages and fresh reads batch every selected ID without truncating above 1000', async () => {
  assert.deepEqual(selectReportItems(['a'], ['b', 'b'], true), ['a', 'b']);
  assert.deepEqual(selectReportItems(['a', 'b'], ['b'], false), ['a']);
  const ids = Array.from({ length: 1203 }, (_, index) => String(index)), calls: string[][] = [];
  const items = await readReportItems([...ids, '1'], async batch => { calls.push(batch); return batch.map(id => product(id)); });
  assert.equal(items.length, ids.length); assert.ok(calls.every(batch => batch.length <= 100));
  assert.deepEqual(calls.flat(), ids);
  await assert.rejects(readReportItems(ids, async () => { throw new Error('Sin conexión'); }), /Sin conexión/);
});

test('printed report contains only the selected snapshot, independent of other inventory and remissions, with every page row preserved', () => {
  const report = build([product('1'), product('2')], ['1']);
  const markup = renderToStaticMarkup(h(Fragment, null, h(InventoryReportHeader, { report }), h(InventoryReportTable, { report, indices: [0] }), h(InventoryReportSummary, { report })));
  const parsed = new JSDOM(markup);
  try {
    assert.equal(parsed.window.document.querySelectorAll('tbody tr').length, 1);
    assert.match(markup, /MAT1/); assert.doesNotMatch(markup, /MAT2|REM-|outgoing:\/\/|storage:\/\//);
    assert.match(markup, /Persona autorizada/); assert.match(markup, /Almacén Honda/); assert.match(markup, /0,5/);
    const pages = paginateRemission(Array(120).fill(75), [32, 32, 32, 32], 750, 40);
    assert.deepEqual(pages.flatMap(page => page.rows), Array.from({ length: 120 }, (_, index) => index));
    assert.deepEqual(pages.flatMap(page => page.closing), [0, 1, 2, 3]);
  } finally { parsed.window.close(); }
});

const dom = new JSDOM('<html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent!.startsWith(text))!;
async function type(host: HTMLElement, value: string) {
  await act(() => {
    const input = host.querySelector<HTMLInputElement>('[aria-label="Buscar productos para el informe"]')!;
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
const filters: ReportFilters = { search: '', category: '', warehouse: '', onlySelected: false, page: 1 };

test('report UI preserves selection across search and pages, prevents double generation and keeps drafts after a failed fresh read', async () => {
  const items = Array.from({ length: 26 }, (_, index) => product(String(index + 1)));
  const calls: string[][] = [], opened: InventoryReport[] = [];
  let fail = true, finish!: (report: InventoryReport) => void;
  function View() {
    const [selected, setSelected] = useState<string[]>([]), [current, setCurrent] = useState(filters);
    return h(InventoryReportsManager, { items, warehouses: locations.warehouses, selectedIds: selected, onSelectionChange: setSelected,
      filters: current, onFiltersChange: setCurrent, categoryLabel: value => value, locationLabel: () => 'Ubicación completa',
      onGenerate: async ids => { calls.push(ids); if (fail) throw new Error('Sin conexión'); return new Promise<InventoryReport>(resolve => { finish = resolve; }); }, onOpen: report => opened.push(report) });
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(View)));
    assert.equal(button(host, 'Generar informe PDF').disabled, true);
    await act(() => host.querySelector<HTMLInputElement>('[aria-label="Seleccionar MAT1 Material repetido"]')!.click());
    await act(() => button(host, 'Siguiente').click());
    await act(() => host.querySelector<HTMLInputElement>('[aria-label="Seleccionar MAT25 Material repetido"]')!.click());
    await type(host, 'MAT1'); assert.match(host.textContent!, /2 producto\(s\) seleccionado/);
    await act(async () => button(host, 'Generar informe PDF').click());
    assert.deepEqual(calls[0], ['1', '25']); assert.equal(opened.length, 0); assert.match(host.querySelector('[role="alert"]')!.textContent!, /Sin conexión/);
    fail = false;
    await act(() => { const generate = button(host, 'Generar informe PDF'); generate.click(); generate.click(); });
    assert.equal(calls.length, 2); assert.equal(host.querySelector('fieldset')!.disabled, true);
    const report = build(items, ['1', '25']);
    await act(async () => finish(report)); assert.equal(opened[0], report);
    assert.match(host.textContent!, /2 producto\(s\) seleccionado/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('report UI requires removing missing products rather than silently printing an incomplete selection', async () => {
  let selection = ['1', 'gone']; let generated = 0;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(InventoryReportsManager, { items: [product('1')], warehouses: [], selectedIds: selection,
      onSelectionChange: ids => { selection = ids; }, filters, onFiltersChange: () => {}, categoryLabel: value => value, locationLabel: () => '',
      onGenerate: async () => { generated++; return build([product('1')]); }, onOpen: () => {} })));
    assert.equal(button(host, 'Generar informe PDF').disabled, true);
    assert.match(host.querySelector('[role="alert"]')!.textContent!, /ya no están disponibles/);
    await act(() => button(host, 'Quitar no disponibles').click());
    assert.deepEqual(selection, ['1']); assert.equal(generated, 0);
  } finally { await act(() => root.unmount()); host.remove(); }
});
