import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryChoices, categoryNameKey, newCategoryKey, formatItemCode, prefixPreview } from '../../src/domain/dataAdministration';
import { mapElemento } from '../../src/data/mappers';
import { viewFromHash } from '../../src/state/useViewNavigation';

test('automatic codes preserve padding and grow beyond 999 without truncation', () => {
  assert.equal(formatItemCode('CAB', 1), 'CAB001');
  assert.equal(formatItemCode('CAB', 1000), 'CAB1000');
  assert.equal(prefixPreview({ id: '1', prefijo: 'CAB', nombre: 'Cables', activo: true, ultimo: 100 }, ['CAB099', 'CAB105', 'PAN200']), 'CAB106');
});
test('custom categories keep their identity and remain available in inventory filters', () => {
  assert.equal(mapElemento({ categoria: 'FERRETERIA' }).categoria, 'FERRETERIA');
  assert.deepEqual(categoryChoices([{ id: 'NUEVA', nombre: 'Nueva', activo: true }], ['ANTIGUA','NUEVA']), ['ANTIGUA','NUEVA']);
  assert.equal(viewFromHash('#/data-admin'), 'data-admin');
  assert.equal(viewFromHash('#/projects'), 'projects');
});

test('inline category names produce valid keys without overwriting an existing category', () => {
  assert.equal(newCategoryKey('Materiales eléctricos', []), 'MATERIALES_ELECTRICOS');
  assert.equal(newCategoryKey('123', []), 'CAT_123');
  assert.equal(newCategoryKey('A', []), 'CAT_A');
  assert.equal(categoryNameKey('  Materiales   eléctricos '), categoryNameKey('materiales eléctricos'));
  const name = 'A'.repeat(100);
  const existing = { id:'A'.repeat(50),nombre:'Otro nombre',activo:true };
  const key = newCategoryKey(name, [existing]);
  assert.equal(key.length,50); assert.match(key,/_2$/); assert.match(key,/^[A-Z][A-Z0-9_]{1,49}$/);
});
