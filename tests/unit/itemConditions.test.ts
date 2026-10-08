import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeItemCondition, itemConditionOptions } from '../../src/domain/itemCondition';
import { mapElemento } from '../../src/data/mappers';

test('legacy conditions normalize without assigning unknown labels a new meaning', () => {
  const cases: [string | null | undefined, string][] = [
    ['OBSOLETO', 'MALO'], [' obsoleto ', 'MALO'], ['MEDIO', 'REGULAR'], ['regular', 'REGULAR'],
    ['MAL  ESTADO', 'MALO'], ['REPARACION', 'EN REPARACIÓN'], ['en reparación', 'EN REPARACIÓN'],
    [' RETAL ', 'RETAZOS'], ['RETAZOS / BUENO', 'RETAZOS'], ['Por revisar', 'Por revisar'], ['', 'BUENO'], [null, 'BUENO'], [undefined, 'BUENO'],
  ];
  for (const [input, expected] of cases) assert.equal(normalizeItemCondition(input), expected);
  for (const { value } of itemConditionOptions) assert.equal(normalizeItemCondition(value), value);
  assert.equal(itemConditionOptions.some(option => /MEDIO|OBSOLETO|MAL ESTADO|^REPARACION$|^RETAL$/.test(option.value)), false);
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
