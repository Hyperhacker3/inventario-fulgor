import assert from 'node:assert/strict';
import test from 'node:test';
import { mapElemento } from '../../src/data/mappers';
import { summarizeInventory } from '../../src/domain/dashboard';

test('dashboard separates pending counts, damaged availability and incompatible units', () => {
  const item = (id: string, values: Record<string, unknown>) => mapElemento({ id, codigo: id, nombre: id,
    categoria: 'CABLES', unidad: 'UND', cantidad: 10, stock_minimo: 0, ...values });
  const summary = summarizeInventory([
    item('A', { cantidad: 3, cantidad_danados: 3 }),
    item('B', { cantidad: 10, cantidad_danados: 2, stock_minimo: 8 }),
    item('C', { cantidad: 999, stock_pendiente: true }),
    item('D', { cantidad: 2.375, unidad: 'MTS' }),
    item('E', { cantidad: 100, archived: true }),
    item('F', { cantidad: 1.125, unidad: 'mts' }),
  ], []);
  assert.equal(summary.total, 5);
  assert.deepEqual(summary.statuses, { Disponible: 2, 'Stock bajo': 1, 'Sin disponibilidad': 1, 'Pendiente de conteo': 1 });
  assert.deepEqual(summary.units, [
    { unit: 'mts', recorded: 3.5, available: 3.5, damaged: 0 },
    { unit: 'und', recorded: 13, available: 8, damaged: 5 },
  ]);
  assert.equal(summary.damagedProducts, 2);
  assert.deepEqual(summary.alerts.map(row => row.id), ['C', 'A', 'B']);
  assert.equal(summary.categories[0].value, 5);
  assert.equal(summary.warehouses[0].label, 'Sin almacén');
  assert.equal(summary.withoutMinimum, 4);
});

test('empty dashboard has zero counts and no fabricated balances or alerts', () => {
  const summary = summarizeInventory([], []);
  assert.equal(summary.total, 0);
  assert.equal(Object.values(summary.statuses).reduce((sum, value) => sum + value, 0), 0);
  assert.deepEqual(summary.units, []);
  assert.deepEqual(summary.alerts, []);
  assert.deepEqual(summary.warehouses, []);
});
