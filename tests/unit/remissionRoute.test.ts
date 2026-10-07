import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement as h, Fragment, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { remissionCode, remissionDate, remissionSequence, validateRemissionRoute } from '../../src/domain/remissionRoute';
import { RemissionRouteFields } from '../../src/components/dispatch/RemissionRouteFields';
import { RemissionHeader, RemissionTable } from '../../src/components/remission/RemissionSections';
import { mapRemision } from '../../src/data/mappers';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');

test('route codes preserve display places, normalize code accents/spaces and use Bogotá emission date with an annual non-truncated sequence', () => {
  const route = validateRemissionRoute({ lugarRemision: ' Honda  ', lugarDestino: ' Bogotá   D.C. ' });
  assert.deepEqual(route, { lugarRemision: 'Honda', lugarDestino: 'Bogotá D.C.' });
  assert.equal(remissionCode(route, '2026-10-07', 6), 'REM-HONDA-BOGOTA-D-C-20261007-006');
  assert.equal(remissionCode({ lugarRemision: 'São José', lugarDestino: 'Bogotá' }, '2026-10-07', 1000), 'REM-SAO-JOSE-BOGOTA-20261007-1000');
  assert.equal(remissionDate(new Date('2027-01-01T02:00:00Z')), '2026-12-31');
  assert.equal(remissionDate(new Date('2027-01-01T05:00:00Z')), '2027-01-01');
  assert.equal(remissionSequence('REM-2026-0005', '2026'), 5);
  assert.equal(remissionSequence('REM-HONDA-BOGOTA-20261007-006', '2026'), 6);
  assert.equal(remissionSequence('REM-HONDA-BOGOTA-20261007-006', '2027'), 0);
  assert.throws(() => validateRemissionRoute({ lugarRemision: ' ', lugarDestino: 'Bogotá' }), /Lugar de remisión/);
  assert.throws(() => validateRemissionRoute({ lugarRemision: 'Honda', lugarDestino: '---' }), /Lugar de destino/);
  assert.throws(() => validateRemissionRoute({ lugarRemision: 'a'.repeat(81), lugarDestino: 'Bogotá' }), /80 caracteres/);
  assert.throws(() => remissionCode(route, '2026-02-30', 1), /inválido/);
});

test('departure asks for both required places, retains their text on refresh, and respects disabled forms', async () => {
  function Field() {
    const [route, setRoute] = useState({ lugarRemision: 'Honda', lugarDestino: 'Bogotá' });
    return h('form', null, h(RemissionRouteFields, { value: route, onChange: setRoute }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Field)));
    const inputs = [...host.querySelectorAll('input')];
    assert.equal(inputs.length, 2); assert.ok(inputs.every(input => input.required && input.maxLength === 80));
    assert.equal(host.querySelector('form')!.checkValidity(), true);
    assert.match(host.textContent!, /REM-HONDA-BOGOTA-\d{8}-…/);
    await act(() => root.render(h(Field))); assert.equal(host.querySelector<HTMLInputElement>('input')!.value, 'Honda');
    await act(() => root.render(h('fieldset', { disabled: true }, h(Field))));
    assert.ok([...host.querySelectorAll('input')].every(input => input.matches(':disabled')));
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('printed route retains historic destinations, places unit weights next to totals, and aligns the document above with inherited NIT type', () => {
  const rem = mapRemision({ numero_remision: 'REM-HONDA-BOGOTA-20261007-006', fecha: '2026-10-07', lugar_remision: 'Honda', lugar_destino: 'Bogotá', ubicacion: 'Dirección del proyecto',
    items: [{ nombre: 'Material', codigo: 'MAT001', marca: 'Marca guardada', unidad: 'und', cantidad: 20, pesoUnitario: { valor: 40, unidad: 'g' }, pesoTotalKg: 0.8 }, { nombre: 'Sin peso', cantidad: 1, unidad: 'und' }] });
  const output = renderToStaticMarkup(h(Fragment, null, h(RemissionHeader, { remision: rem }), h(RemissionTable, { remision: rem, indices: [0, 1] })));
  const css = fs.readFileSync(new URL('../../src/components/remission/remission.css', import.meta.url), 'utf8');
  const printed = new JSDOM(`<html><head><style>${css}</style></head><body><section class="rm-sheet"><div class="rm-content">${output}</div></section></body></html>`);
  try {
    const header = printed.window.document.querySelector('.rm-header')!;
    assert.match(header.textContent!, /Lugar de remisiónHonda/); assert.match(header.textContent!, /Lugar de destinoBogotá/);
    assert.match(header.textContent!, /Ubicación del proyectoDirección del proyecto/); assert.match(header.textContent!, /07\/10\/2026/);
    const labels = [...printed.window.document.querySelectorAll('th')].map(th => th.textContent);
    assert.deepEqual(labels.slice(-2), ['Peso unitario (kg)', 'Peso total (kg)']);
    const cells = [...printed.window.document.querySelectorAll('tbody tr:first-child td')];
    assert.equal(cells.length, 7); assert.equal(cells[2].textContent, 'MaterialMarca: Marca guardada');
    assert.equal(cells[5].textContent, '0,04'); assert.equal(cells[6].textContent, '0,8');
    assert.ok([...printed.window.document.querySelectorAll('tbody tr:last-child td')].slice(-2).every(td => td.textContent === 'Pendiente'));
    assert.equal(printed.window.getComputedStyle(printed.window.document.querySelector('.rm-sheet')!).justifyContent, 'flex-start');
    const nit = printed.window.getComputedStyle(printed.window.document.querySelector('.rm-company-nit')!);
    assert.equal(nit.fontFamily, 'inherit'); assert.equal(nit.fontSize, 'inherit');
    assert.match(css, /@media print[\s\S]*justify-content: flex-start !important/);
    const legacy = mapRemision({ numero_remision: 'REM-2026-0005', ubicacion: 'Destino anterior' });
    assert.match(renderToStaticMarkup(h(RemissionHeader, { remision: legacy })), /Destino anterior/);
    assert.equal(legacy.lugarRemision, '');
  } finally { printed.window.close(); }
});
