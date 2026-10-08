import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ExplorerResultsContent } from '../../src/components/explorer/ExplorerResults';
import { mapElemento } from '../../src/data/mappers';
import type { Elemento } from '../../src/types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const items = [1, 2].map(index => mapElemento({ id: `item-${index}`, codigo: `MAT00${index}`,
  nombre: `Material ${index}`, categoria: 'OTROS', cantidad: 12, stock_minimo: 2, unidad: 'UND' }));

async function withResults(mode: 'grid' | 'list', check: (host: HTMLElement, opened: Elemento[], dispatched: Elemento[]) => Promise<void>, products = items) {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const opened: Elemento[] = [], dispatched: Elemento[] = [];
  try {
    await act(() => root.render(h(ExplorerResultsContent, { items: products, mode, inventory: {
      user: { name: 'Operador', email: 'operator@app.test', role: 'operador', avatar: '' },
      openItemDetail: item => { opened.push(item); }, addToDispatchCart: item => { dispatched.push(item); },
      categoryLabel: () => 'Otros materiales', getAlmacenById: () => ({ id: 'warehouse-test', nombre: 'Almacén de prueba', codigo: 'TEST', ciudad: 'Ciudad de prueba', capacidadPorcentaje: 0, estado: 'Operativo' as const }),
    } })));
    await check(host, opened, dispatched);
  } finally { document.getSelection()?.removeAllRanges(); await act(() => root.unmount()); host.remove(); }
}
const click = async (target: HTMLElement) => { await act(() => target.click()); };
const product = (host: HTMLElement, item: Elemento) => host.querySelector<HTMLElement>(`[data-product-id="${item.id}"]`)!;
const cart = (surface: HTMLElement) => [...surface.querySelectorAll<HTMLButtonElement>('button')]
  .find(button => /add_shopping_cart|shopping_cart_checkout/.test(button.textContent!))!;

for (const mode of ['list', 'grid'] as const) {
  test(`${mode}: inventory emphasizes uppercase names with only the requested metadata and a single red dispatch action`, async () => {
    const products = [{ ...items[0], nombre: 'Cable solar largo con descripción', marca: 'Fabricante', pesoUnitario: { valor: 2, unidad: 'kg' as const } }];
    await withResults(mode, async host => {
      const surface = product(host, products[0]), name = surface.querySelector<HTMLButtonElement>('.ui-product-open')!;
      assert.equal(name.textContent, 'CABLE SOLAR LARGO CON DESCRIPCIÓN'); assert.ok((mode === 'grid' ? name.parentElement! : name).classList.contains('sm:text-lg'));
      assert.equal(name.classList.contains('truncate'), false); assert.doesNotMatch(surface.textContent!, /2 kg|Peso pendiente|\/ und/);
      assert.equal([...surface.querySelectorAll('button')].some(button => button.textContent === 'Detalles'), false);
      assert.equal(surface.querySelectorAll('button').length, 2); // Accessible name + independent dispatch action.
      if (mode === 'list') {
        const component = surface.querySelector('td:nth-child(2)')!;
        assert.doesNotMatch(component.textContent!, /Fabricante|Otros materiales|dañados/);
        assert.equal(surface.querySelector('td:nth-child(3)')!.textContent, 'Otros materiales');
      } else {
        assert.match(surface.textContent!, /Marca: FABRICANTE/); assert.ok(cart(surface).classList.contains('text-[#dd4c42]'));
        assert.equal(name.classList.contains('inventory-product-name'), false);
        assert.equal(name.querySelector('.inventory-product-name')!.textContent, name.textContent);
        assert.ok(name.classList.contains('block'));
      }
      await Promise.resolve();
    }, products);
  });
  test(`${mode}: the entire product opens its own detail, including code, location, stock, image and free surface`, async () => {
    await withResults(mode, async (host, opened, dispatched) => {
      for (const item of items) {
        const surface = product(host, item);
        const text = (value: string) => [...surface.querySelectorAll<HTMLElement>('span, td')]
          .find(node => node.textContent?.trim() === value)!;
        const image = mode === 'grid' ? surface.firstElementChild as HTMLElement : surface.querySelector<HTMLElement>('td:nth-child(2) .shrink-0')!;
        const stock = mode === 'grid' ? text('12 DISP') : text('12');
        for (const target of [surface, text(item.codigo), text('Almacén de prueba'), stock, image]) {
          await click(target);
          assert.equal(opened.at(-1), item);
        }
      }
      assert.equal(opened.length, 10); assert.equal(dispatched.length, 0);
    });
  });

  test(`${mode}: nested name actions open once, while the cart action only adds to dispatch`, async () => {
    await withResults(mode, async (host, opened, dispatched) => {
      const surface = product(host, items[1]);
      await click(surface.querySelector<HTMLButtonElement>('.ui-product-open')!);
      assert.deepEqual(opened, [items[1]]);
      const details = [...surface.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Detalles');
      assert.equal(details, undefined); assert.equal(surface.querySelector('[title="Ver detalles"]'), null);
      await click(cart(surface).querySelector<HTMLElement>('span')!);
      assert.deepEqual(dispatched, [items[1]]); assert.equal(opened.length, 1);
    });
  });

  test(`${mode}: disabled dispatch controls cannot add unavailable stock or accidentally open details`, async () => {
    const unavailable = [{ ...items[0], cantidad: 0 }, { ...items[1], cantidadDanados: items[1].cantidad }];
    await withResults(mode, async (host, opened, dispatched) => {
      for (const item of unavailable) {
        const surface = product(host, item), button = cart(surface);
        assert.equal(button.disabled, true);
        await click(button);
        await click(button.querySelector<HTMLElement>('span')!);
        assert.equal(opened.length, 0); assert.equal(dispatched.length, 0);
      }
      await click(product(host, unavailable[0]));
      assert.deepEqual(opened, [unavailable[0]]);
    }, unavailable);
  });

  test(`${mode}: copying product text does not open a modal; its native name button remains keyboard accessible`, async () => {
    await withResults(mode, async (host, opened) => {
      const surface = product(host, items[0]), name = surface.querySelector<HTMLButtonElement>('.ui-product-open')!;
      const selection = document.getSelection()!, range = document.createRange();
      range.selectNodeContents(name); selection.addRange(range);
      assert.equal(selection.isCollapsed, false);
      await click(surface); assert.equal(opened.length, 0);
      selection.removeAllRanges();
      name.focus(); assert.equal(document.activeElement, name);
      assert.equal(name.type, 'button'); assert.equal(name.disabled, false);
      assert.equal(name.getAttribute('aria-label'), `Ver detalles de ${items[0].codigo} · ${items[0].nombre}`);
      assert.equal(surface.hasAttribute('role'), false); // Keep article/table semantics around independent actions.
      await click(name); assert.deepEqual(opened, [items[0]]);
      await click(surface); assert.equal(opened.length, 2);
    });
  });
}
