import assert from 'node:assert/strict';
import test from 'node:test';
import { observationChunks, paginateRemission } from '../../src/domain/remissionLayout';
import { emptyTransport, validateTransport } from '../../src/domain/remissionTransport';
import { mapRemision } from '../../src/data/mappers';

test('measured remission pagination keeps all rows and closing blocks without empty pages', () => {
  assert.deepEqual(paginateRemission([32, 32], [40, 100, 140], 650, 40), [{ rows: [0, 1], closing: [0, 1, 2] }]);
  for (const heights of [Array(60).fill(35), [90, 40, 80, 100, 35, 65, 45, 45, 45]]) {
    const closing = [40, 60, 120, 80];
    const pages = paginateRemission(heights, closing, 650, 40);
    assert.deepEqual(pages.flatMap(page => page.rows), heights.map((_, index) => index));
    assert.deepEqual(pages.flatMap(page => page.closing), closing.map((_, index) => index));
    for (const page of pages) {
      assert.ok(page.rows.length + page.closing.length > 0);
      const height = page.rows.reduce((sum, i) => sum + heights[i], page.rows.length ? 40 : 0) + page.closing.reduce((sum, i) => sum + closing[i], 0);
      assert.ok(height <= 650);
    }
  }
  const longNotes = paginateRemission([35], Array(30).fill(60).concat(120), 650, 40);
  assert.equal(longNotes.flatMap(page => page.closing).length, 31);
  assert.deepEqual(observationChunks('Palabra '.repeat(500)).join(' ').split(/\s+/).filter(Boolean), Array(500).fill('Palabra'));
});
test('transport mapping preserves absent weights, zero weights and text identifiers', () => {
  const rem = mapRemision({ datos_transporte: { cedulaTransportador: '00123' }, items: [{ pesoTotalKg: 0 }, {}] });
  assert.equal(rem.datosTransporte?.cedulaTransportador, '00123');
  assert.equal(rem.items[0].pesoTotalKg, 0);
  assert.equal(rem.items[1].pesoTotalKg, undefined);
  assert.equal(mapRemision({}).datosTransporte?.transportador, '');
});
test('optional transport validates dates, ordering and decimal weights', () => {
  validateTransport(emptyTransport(), {});
  validateTransport({ ...emptyTransport(), fechaDespacho: '2026-10-05', fechaDevolucion: '2026-10-05' }, { item: 0, other: 2.125 });
  assert.throws(() => validateTransport({ ...emptyTransport(), fechaDespacho: '2026-02-30' }, {}), /fecha inválida/);
  assert.throws(() => validateTransport({ ...emptyTransport(), fechaDespacho: '2026-10-05', fechaDevolucion: '2026-10-04' }, {}), /anterior/);
  assert.throws(() => validateTransport(emptyTransport(), { item: 0.0001 }), /tres decimales/);
});
