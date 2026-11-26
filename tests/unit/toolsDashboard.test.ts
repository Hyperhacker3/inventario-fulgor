import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { mapElemento } from '../../src/data/mappers';
import { summarizeTools } from '../../src/domain/toolsDashboard';
import type { Categoria, Elemento } from '../../src/types';
import type { InventoryFilters } from '../../src/domain/explorer';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { ToolsOverviewSection } = await import('../../src/components/dashboard/ToolsOverviewSection');

const categories: Categoria[] = [
  { id: 'HERRAMIENTAS_ELECTRICAS', nombre: 'HERRAMIENTAS ELÉCTRICAS', activo: true, hoja_vida_tipo: 'ELECTRICA' },
  { id: 'HERRAMIENTAS_COMBUSTION', nombre: 'HERRAMIENTAS A COMBUSTIÓN', activo: true, hoja_vida_tipo: 'COMBUSTION' },
  { id: 'CABLES', nombre: 'CABLES', activo: true },
];

const tool = (id: string, categoria: string, estado: string, cantidad: number, updatedAt: string, extra: Record<string, unknown> = {}) =>
  mapElemento({ id, codigo: id, nombre: `Herramienta ${id}`, categoria, estado, cantidad, unidad: 'UND', updated_at: updatedAt, ...extra });

const sample: Elemento[] = [
  tool('EL1', 'HERRAMIENTAS_ELECTRICAS', 'PARA REPARAR', 2, '2026-11-26T14:00:00Z'),
  tool('EL2', 'HERRAMIENTAS_ELECTRICAS', 'BUENO', 5, '2026-11-25T10:00:00Z'),
  tool('EL3', 'HERRAMIENTAS_ELECTRICAS', 'EN REPARACIÓN', 1, '2026-11-24T10:00:00Z'),
  tool('EL4', 'HERRAMIENTAS_ELECTRICAS', 'PARA REPARAR', 1, '2026-11-20T09:00:00Z'),
  tool('CB1', 'HERRAMIENTAS_COMBUSTION', 'PARA REPARAR', 3, '2026-11-26T15:00:00Z'),
  tool('CB2', 'HERRAMIENTAS_COMBUSTION', 'MALO', 1, '2026-11-23T08:00:00Z'),
  tool('CB3', 'HERRAMIENTAS_COMBUSTION', 'PARA REPARAR', 1, '2026-11-26T12:00:00Z'),
  tool('ARC', 'HERRAMIENTAS_ELECTRICAS', 'PARA REPARAR', 10, '2026-11-26T16:00:00Z', { archived: true }),
  tool('CAB', 'CABLES', 'PARA REPARAR', 99, '2026-11-26T17:00:00Z'),
];

test('summarizeTools counts electric and combustion units separately and returns the latest 3 tools for repair', () => {
  const all = summarizeTools(sample, categories, 'ALL', 3);
  assert.equal(all.all.references, 7);
  assert.equal(all.all.units, 14);
  assert.equal(all.all.forRepairUnits, 7);
  assert.equal(all.all.forRepairRefs, 4);
  assert.equal(all.all.inRepairUnits, 1);
  assert.equal(all.all.badUnits, 1);
  assert.equal(all.all.operationalUnits, 5);
  assert.equal(all.all.operationalPercent, 36);
  assert.deepEqual(all.recentForRepair.map(row => row.item.id), ['CB1', 'EL1', 'CB3'], 'ordered by latest activity and excludes archived/non-tools');
  assert.deepEqual(all.recentForRepair.map(row => row.type), ['COMBUSTION', 'ELECTRICA', 'COMBUSTION']);

  const electric = summarizeTools(sample, categories, 'ELECTRICA', 3);
  assert.equal(electric.selected.units, 9);
  assert.equal(electric.selected.forRepairUnits, 3);
  assert.deepEqual(electric.recentForRepair.map(row => row.item.id), ['EL1', 'EL4']);

  const combustion = summarizeTools(sample, categories, 'COMBUSTION', 3);
  assert.equal(combustion.selected.units, 5);
  assert.equal(combustion.selected.forRepairUnits, 4);
  assert.deepEqual(combustion.recentForRepair.map(row => row.item.id), ['CB1', 'CB3']);
});

test('ToolsOverviewSection switches tool scopes interactively, opens details on click and filters inventory', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const opened: Elemento[] = [];
  const filtered: InventoryFilters[] = [];
  const findButton = (text: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(btn => text.test(btn.textContent || ''))!;
  try {
    await act(() => root.render(h(ToolsOverviewSection, {
      items: sample,
      categories,
      warehouseScope: 'ALM-1',
      getLocationString: (item: Elemento) => `Bodega · ${item.codigo}`,
      onOpenItem: (item: Elemento) => { opened.push(item); },
      onOpenInventory: (filters: InventoryFilters) => { filtered.push(filters); },
    })));
    assert.match(host.textContent!, /Eléctricas y a combustión/);
    assert.match(host.textContent!, /CB1/);
    assert.match(host.textContent!, /EL1/);
    assert.match(host.textContent!, /CB3/);
    assert.doesNotMatch(host.textContent!, /EL4/, 'only the latest 3 repair tools are shown in ALL scope');

    // Click the first recent repair tool -> opens detail directly
    await act(() => findButton(/CB1/).click());
    assert.deepEqual(opened.map(row => row.id), ['CB1']);

    // Switch scope to Eléctricas -> updates list to show EL1 and EL4, hiding CB1
    await act(() => findButton(/^electric_boltEléctricas|^Eléctricas/).click());
    assert.match(host.textContent!, /EL4/);
    assert.doesNotMatch(host.textContent!, /CB1/);

    // Click "Necesitan reparación" tile -> opens Inventory filtered to electric tools + PARA REPARAR + warehouse ALM-1
    await act(() => findButton(/Necesitan reparación/).click());
    assert.equal(filtered.length, 1);
    assert.deepEqual(filtered[0].categories, ['HERRAMIENTAS_ELECTRICAS']);
    assert.equal(filtered[0].condition, 'PARA REPARAR');
    assert.equal(filtered[0].warehouseId, 'ALM-1');
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
