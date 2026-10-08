import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { RemissionCard } from '../../src/components/remission/RemissionCard';
import { mapRemision } from '../../src/data/mappers';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');

test('search clear controls empty the live query, retain focus and never submit the containing form', async () => {
  let query = '', submits = 0;
  function Form({ disabled = false }: { disabled?: boolean }) {
    const [value, setValue] = useState('Cable');
    query = value;
    return h('form', { onSubmit: event => { event.preventDefault(); submits++; } }, h(SearchInput, {
      value, disabled, 'aria-label': 'Buscar material', onChange: event => setValue(event.target.value), onClear: () => setValue(''), className: 'w-full p-3',
    }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form, { disabled: true })));
    const clear = host.querySelector<HTMLButtonElement>('[aria-label="Borrar búsqueda"]')!;
    assert.equal(clear.disabled, true);
    await act(() => clear.click()); assert.equal(query, 'Cable');
    await act(() => root.render(h(Form)));
    await act(() => clear.click());
    assert.equal(query, ''); assert.equal(host.querySelector('input')!.value, '');
    assert.equal(host.querySelector('[aria-label="Borrar búsqueda"]'), null);
    assert.equal(document.activeElement, host.querySelector('input')); assert.equal(submits, 0);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('each remission has independent PDF and photo actions in its heading, including records without photos', async () => {
  const records = [mapRemision({ id: 'r1', numero_remision: 'REM-HONDA-BOGOTA-20261008-008', fotos_salida: ['https://app.test/photo.jpg'] }),
    mapRemision({ id: 'r2', numero_remision: 'REM-2026-0001' })];
  const pdfs: string[] = [], photos: string[] = [];
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h('div', {}, records.map(remission => h(RemissionCard, { key: remission.id, remission,
      onPdf: () => pdfs.push(remission.id), onPhotos: () => photos.push(remission.id) })))));
    for (const [index, article] of [...host.querySelectorAll('article')].entries()) {
      const heading = article.querySelector('.remission-card-heading')!;
      const controls = heading.querySelectorAll<HTMLButtonElement>('button');
      assert.equal(controls.length, 2); assert.match(controls[1].getAttribute('aria-label')!, new RegExp(records[index].numeroRemision));
      await act(() => controls[1].click()); await act(() => controls[0].click());
      assert.equal(photos.at(-1), records[index].id); assert.equal(pdfs.at(-1), records[index].id);
      assert.equal(article.querySelectorAll('button').length, 2);
    }
  } finally { await act(() => root.unmount()); host.remove(); }
});
