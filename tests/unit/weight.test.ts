import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapElemento, mapRemision } from '../../src/data/mappers';
import { formatKg, lineWeightKg, parseWeightDraft, totalWeight } from '../../src/domain/weight';
import { RemissionClosing, RemissionTable } from '../../src/components/remission/RemissionSections';

test('unit weight supports grams, kilos, decimals and unknown values without false zeros', () => {
  assert.equal(lineWeightKg({ valor:40, unidad:'g' },20),0.8);
  assert.equal(lineWeightKg({ valor:2.5, unidad:'kg' },3),7.5);
  assert.equal(lineWeightKg({ valor:0.001, unidad:'g' },0.001),0.000000001);
  assert.equal(lineWeightKg(null,20),null);
  assert.equal(parseWeightDraft({ amount:'', unit:'g' }),null);
  assert.throws(() => parseWeightDraft({ amount:'0', unit:'kg' }),/mayor que cero/);
  assert.throws(() => parseWeightDraft({ amount:'0.0001', unit:'g' }),/tres decimales/);
  assert.deepEqual(totalWeight([{ pesoTotalKg:0.1 },{ pesoTotalKg:0.2 },{}]),{ total:0.3,pending:1,known:2 });
  assert.equal(formatKg(0.8),'0,8 kg');
});
test('inventory metadata and remission snapshots preserve the declared unit weight', () => {
  const item = mapElemento({ especificaciones:{ peso_unitario:{ valor:40, unidad:'g' }, fotos_adicionales:['storage://photo'] } });
  assert.deepEqual(item.pesoUnitario,{ valor:40,unidad:'g' });
  assert.equal(mapElemento({}).pesoUnitario,null);
  const remission = mapRemision({ items:[{ nombre:'Ejemplo',codigo:'EJE001',cantidad:20,unidad:'und',pesoUnitario:{ valor:40,unidad:'g' },pesoTotalKg:0.8 },{ nombre:'Pendiente',cantidad:1,unidad:'und' }] });
  const table = renderToStaticMarkup(createElement(RemissionTable,{ remision:remission,indices:[0,1] }));
  const closing = renderToStaticMarkup(createElement(RemissionClosing,{ remision:remission,notes:['Sin observaciones.'],indices:[0] }));
  assert.match(table,/0,8/); assert.match(table,/Por unidad: 0,04 kg/); assert.match(table,/Pendiente/);
  assert.match(closing,/Peso parcial conocido: 0,8 kg/); assert.match(closing,/1 material/);
});
