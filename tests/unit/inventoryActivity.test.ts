import assert from 'node:assert/strict';
import test from 'node:test';
import { mapElemento } from '../../src/data/mappers';
import { orderInventoryByActivity, filterInventory, emptyInventoryFilters } from '../../src/domain/explorer';

const item = (id: string, created: string, updated: string) => mapElemento({
  id, codigo: id, nombre: `Material ${id}`, cantidad: 5, created_at: created, updated_at: updated,
});
test('recent activity outranks creation, handles timestamp offsets and resolves simultaneous activity consistently without mutating cache', () => {
  const older = item('A', '2026-01-01T00:00:00Z', '2026-10-07T11:00:00-05:00');
  const newer = item('B', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z');
  const tied = item('C', '2026-10-07T00:00:00Z', '2026-10-07T16:00:00Z');
  const fallback = item('D', '2026-10-05T00:00:00Z', '');
  const products = [newer, tied, fallback, older];
  assert.deepEqual(orderInventoryByActivity(products).map(row => row.id), ['A', 'C', 'B', 'D']);
  assert.deepEqual(products.map(row => row.id), ['B', 'C', 'D', 'A']);
  assert.equal(orderInventoryByActivity(products)[0], older);
});
test('a stock or metadata refresh moves the affected product ahead before filtering and pagination without losing its fields', () => {
  const products = Array.from({ length: 25 }, (_, index) => item(`P${String(index).padStart(2, '0')}`, '2026-01-01T00:00:00Z', '2026-10-06T00:00:00Z'));
  assert.equal(orderInventoryByActivity(products).slice(0, 24).some(row => row.id === 'P24'), false);
  for (const change of [{ cantidad: 6 }, { cantidad: 4 }, { nombre: 'MATERIAL EDITADO' }]) {
    const refreshed = products.map(row => row.id === 'P24' ? { ...row, ...change, updatedAt: '2026-10-07T16:00:00Z' } : row);
    const filtered = filterInventory(refreshed, emptyInventoryFilters(), '', () => 'Almacén de prueba');
    const first = orderInventoryByActivity(filtered).slice(0, 24)[0];
    assert.equal(first.id, 'P24');
    for (const [key, value] of Object.entries(change)) assert.equal(first[key as keyof typeof first], value);
    assert.equal(first.codigo, 'P24');
  }
});
