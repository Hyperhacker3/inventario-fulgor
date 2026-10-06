import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryChoices, formatItemCode, prefixPreview } from '../../src/domain/dataAdministration';
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
