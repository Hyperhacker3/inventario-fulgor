import assert from 'node:assert/strict';
import test from 'node:test';
import { ensurePrefixChoice, categoryChoices, categoryNameKey, newCategoryKey, formatItemCode, prefixPreview } from '../../src/domain/dataAdministration';
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


test('creating a prefix reuses an active code without changing its name or counter and rejects inactive or invalid codes', async () => {
  const existing={id:'CODE-1',prefijo:'CAB',nombre:'Cables',activo:true,ultimo:100};
  let writes=0,reads=0;
  const save=async()=>{writes++;return [];};const refresh=async()=>{reads++;return [];};
  assert.equal(await ensurePrefixChoice(' cab ',[existing],save,refresh),existing);
  await assert.rejects(ensurePrefixChoice('CAB',[{...existing,activo:false}],save,refresh),/inactivo/);
  for(const invalid of ['AB','ABCD','AB1','123','CAÑ']) await assert.rejects(ensurePrefixChoice(invalid,[],save,refresh),/tres letras/);
  assert.equal(writes,0);assert.equal(reads,0);
});

test('prefix creation confirms the saved catalog and recovers a concurrent creation or a lost response', async () => {
  const prefix={id:'CODE-1',prefijo:'CAB',nombre:'Cables',activo:true,ultimo:100};
  assert.equal(await ensurePrefixChoice('cab',[],async code=>{assert.equal(code,'CAB');return [prefix];},async()=>[]),prefix);
  const failure=new Error('Respuesta perdida');
  assert.equal(await ensurePrefixChoice('CAB',[],async()=>{throw failure;},async()=>[prefix]),prefix);
  assert.equal(await ensurePrefixChoice('CAB',[],async()=>[],async()=>[prefix]),prefix);
  await assert.rejects(ensurePrefixChoice('CAB',[],async()=>{throw failure;},async()=>[]),failure);
  assert.equal(prefixPreview(prefix,[]),'CAB101');
});
