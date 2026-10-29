import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeItemCondition, itemConditionOptions, damagedQuantity } from '../../src/domain/itemCondition';
import { mapElemento } from '../../src/data/mappers';
import { available } from '../../src/domain/inventory';
import { inventoryValues, inventoryLocationValues } from '../../src/domain/money';
import { emptyInventoryFilters, filterInventory } from '../../src/domain/explorer';

test('legacy conditions normalize without assigning unknown labels a new meaning', () => {
  const cases: [string | null | undefined, string][] = [
    ['OBSOLETO', 'MALO'], [' obsoleto ', 'MALO'], ['MEDIO', 'REGULAR'], ['regular', 'REGULAR'],
    ['dañado', 'MALO'], ['DAÑADA','MALO'], ['para reparar','PARA REPARAR'], ['MAL  ESTADO', 'MALO'], ['REPARACION', 'EN REPARACIÓN'], ['en reparación', 'EN REPARACIÓN'],
    [' RETAL ', 'RETAZOS'], ['RETAZOS / BUENO', 'RETAZOS'], ['Por revisar', 'Por revisar'], ['', 'BUENO'], [null, 'BUENO'], [undefined, 'BUENO'],
  ];
  for (const [input, expected] of cases) assert.equal(normalizeItemCondition(input), expected);
  for (const { value } of itemConditionOptions) assert.equal(normalizeItemCondition(value), value);
  assert.equal(itemConditionOptions.some(option => /MEDIO|OBSOLETO|MAL ESTADO|^REPARACION$|^RETAL$/.test(option.value)), false);
});

test('damage conditions count all stock once, preserve declared partial counts and agree on availability, filters and values', () => {
  const states = ['MALO','dañado','MAL ESTADO','OBSOLETO','EN REPARACIÓN','reparacion','PARA REPARAR'];
  for (const estado of states) {
    const item = mapElemento({ id:'tool', almacen_id:'w', estanteria_id:'r', nivel_id:'n', caja_id:'b',
      estado, cantidad:2.375,cantidad_danados:0.5,unidad:'MTS',especificaciones:{valor_unitario_cop:100} });
    const before = structuredClone(item);
    assert.equal(damagedQuantity(item),2.375); assert.equal(available(item),0);
    assert.deepEqual(inventoryValues([item]), { total:237.5,damaged:237.5,usable:0,damagedPercent:100,warehouses:new Map([['w',237.5]]) });
    const locations=inventoryLocationValues([item]);
    for(const values of [locations.warehouses.get('w'),locations.racks.get('r'),locations.levels.get('n'),locations.boxes.get('b')])
      assert.deepEqual(values,{total:237.5,damaged:237.5});
    assert.deepEqual(filterInventory([item],{...emptyInventoryFilters(),stock:'disponible'},'',()=>''),[]);
    assert.deepEqual(filterInventory([item],{...emptyInventoryFilters(),stock:'agotado'},'',()=>''),[item]);
    assert.deepEqual(item,before);
    const restored={...item,estado:'BUENO'};assert.equal(damagedQuantity(restored),0.5);assert.equal(available(restored),1.875);
  }
  for(const estado of ['BUENO','REGULAR','RETAZOS','Por revisar'])assert.equal(damagedQuantity({cantidad:5,cantidadDanados:1,estado}),1);
  assert.equal(damagedQuantity({cantidad:0,cantidadDanados:0,estado:'PARA REPARAR'}),0);
});

test('loading conditions supports legacy specification values and preserves quantities', () => {
  for (const [source, expected] of [
    [{ estado: 'OBSOLETO' }, 'MALO'], [{ especificaciones: { estado_material: 'MEDIO' } }, 'REGULAR'],
    [{ estado: 'RETAL' }, 'RETAZOS'],
  ] as const) {
    const item = mapElemento({ ...source, cantidad: 12, cantidad_danados: 3 });
    assert.equal(item.estado, expected); assert.equal(item.cantidad, 12); assert.equal(item.cantidadDanados, 3);
  }
});
