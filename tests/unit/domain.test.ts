import assert from 'node:assert/strict';
import test from 'node:test';
import { mapElemento, mapHistory, mapRemision } from '../../src/data/mappers';
import { validateItem, locationLabel } from '../../src/domain/inventory';
import { validateDispatch } from '../../src/domain/dispatch';
import { csvCell } from '../../src/shared/csv';

test('mappers preserve string IDs, zero values and null stock history', () => {
  const item = mapElemento({ id: 'ELM-0007', codigo: 'PAN007', nombre: 'Panel', categoria: 'PANELES',
    cantidad: 0, stock_minimo: 0, almacen_id: null, cantidad_danados: 0, unidad: 'KL' });
  assert.equal(item.id, 'ELM-0007');
  assert.equal(item.cantidad, 0);
  assert.equal(item.stockMinimo, 0);
  assert.equal(item.almacenId, null);
  assert.equal(item.unidad, 'kl');
  assert.equal(locationLabel(item, new Map(), new Map(), new Map()), 'Sin ubicación asignada');
  const history = mapHistory({ id: 'MOV-0008', tipo: 'AJUSTE', elemento_id: item.id,
    elemento_codigo: item.codigo, elemento_nombre: item.nombre, cantidad: 0, unidad: 'UND', stock_anterior: null, stock_nuevo: 0 });
  assert.equal(history.stockAnterior, null);
  assert.equal(history.stockNuevo, 0);
  const remission = mapRemision({ id: 'REM-0001', numero_remision: 'REM-0001', items: [
    { elementoId: 'ELM-0007', codigo: 'PAN007', cantidad: 1, unidad: 'UND' },
  ] }, new Map([['PAN007', { ...item, id: 'another-id' }]]));
  assert.equal(remission.items[0].elementoId, 'ELM-0007');
});

test('validators accept three decimals and dispatch only available stock', () => {
  const item = mapElemento({ id: 'ELM-1', codigo: 'PAN001', nombre: 'Panel', categoria: 'PANELES',
    cantidad: 5, stock_minimo: 0, cantidad_danados: 2, unidad: 'UND' });
  assert.doesNotThrow(() => validateItem(item, [], [], []));
  assert.doesNotThrow(() => validateItem({ ...item, cantidad: 3.125 }, [], [], []));
  assert.throws(() => validateItem({ ...item, cantidad: 3.1234 }, [], [], []), /tres decimales/);
  assert.throws(() => validateDispatch([{ elemento: item, cantidad: 4 }], [item]), /Stock insuficiente/);
  assert.doesNotThrow(() => validateDispatch([{ elemento: item, cantidad: 1.5 }], [item]));
  assert.throws(() => validateDispatch([{ elemento: item, cantidad: 1.1234 }], [item]), /tres decimales/);
});

test('CSV escapes formulas, commas, quotes and line breaks', () => {
  assert.equal(csvCell('=SUM(1,1)'), '"\'=SUM(1,1)"');
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell(-3), '"-3"');
});
