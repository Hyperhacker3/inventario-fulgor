import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { useFormScroll } from '../../src/hooks/useFormScroll';
import { Select } from '../../src/components/ui/Select';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const revealed: { node: HTMLElement; options: ScrollIntoViewOptions }[] = [];
dom.window.HTMLElement.prototype.scrollIntoView = function (options) { revealed.push({ node: this, options: options as ScrollIntoViewOptions }); };
let reduced = false;
Object.defineProperty(dom.window, 'matchMedia', { value: () => ({ matches: reduced }) });
const tick = () => act(() => new Promise<void>(resolve => setTimeout(resolve, 15)));

function Form({ inlineError = '', inactive = false }: { inlineError?: string; inactive?: boolean }) {
  const scroll = useFormScroll<HTMLFormElement>();
  const [error, setError] = useState('');
  return h('form', { ref: scroll.ref, onInvalidCapture: scroll.onInvalidCapture, inert: inactive },
    h('input', { id: 'first', required: true, defaultValue: 'borrador' }), h('input', { id: 'second', required: true }),
    h(Select, { id: 'choice', required: true, value: '', onChange() {} }, h('option', { value: '' }, 'Seleccione')),
    error && h('p', { role: 'alert' }, error), inlineError && h('section', null, h('p', { role: 'alert' }, inlineError)),
    h('button', { type: 'button', id: 'fail', onClick: () => { setError('Error de conexión'); scroll.revealError(); } }, 'Guardar con error'),
    h('button', { type: 'button', id: 'ok', onClick: () => { setError(''); scroll.scrollToStart(); } }, 'Guardado confirmado'));
}

test('form scroll reveals inline/server errors, focuses the alert and repeats the same failure without losing drafts', async () => {
  revealed.length = 0;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    await act(() => host.querySelector<HTMLButtonElement>('#fail')!.click()); await tick();
    assert.equal(revealed.length, 1); assert.equal(revealed[0].node.textContent, 'Error de conexión');
    assert.equal(document.activeElement, revealed[0].node); assert.equal(revealed[0].options.block, 'center');
    assert.equal(host.querySelector<HTMLInputElement>('#first')!.value, 'borrador');
    await act(() => host.querySelector<HTMLButtonElement>('#fail')!.click()); await tick(); assert.equal(revealed.length, 2);
    revealed.length = 0;
    await act(() => root.render(h(Form, { inlineError: 'La caja no se pudo crear' }))); await tick();
    assert.equal(revealed[0].node.textContent, 'La caja no se pudo crear');
    await act(() => root.render(h(Form, { inlineError: 'Error en vista saliente', inactive: true }))); await tick();
    assert.equal(revealed.length, 1);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('native validation scrolls to the first invalid field and reveals the visible proxy of a required select', async () => {
  revealed.length = 0;
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    await act(() => {
      host.querySelector('#first')!.dispatchEvent(new dom.window.Event('invalid', { cancelable: true }));
      host.querySelector('#second')!.dispatchEvent(new dom.window.Event('invalid', { cancelable: true }));
    }); await tick();
    assert.equal(revealed.length, 1); assert.equal(revealed[0].node.id, 'first'); assert.equal(document.activeElement?.id, 'first');
    await act(() => host.querySelector('#choice-value')!.dispatchEvent(new dom.window.Event('invalid', { cancelable: true }))); await tick();
    assert.equal(revealed[1].node.id, 'choice'); assert.equal(document.activeElement?.id, 'choice');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('confirmed save scrolls the app container to top, cancels obsolete errors and respects reduced motion and unmount', async () => {
  revealed.length = 0; reduced = true;
  const host = document.body.appendChild(document.createElement('div')); host.className = 'app-main';
  const tops: ScrollToOptions[] = []; host.scrollTo = options => { tops.push(options as ScrollToOptions); };
  const root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    await act(() => host.querySelector<HTMLButtonElement>('#fail')!.click()); await tick();
    assert.equal(revealed[0].options.behavior, 'auto'); revealed.length = 0;
    await act(() => { host.querySelector<HTMLButtonElement>('#fail')!.click(); host.querySelector<HTMLButtonElement>('#ok')!.click(); }); await tick();
    assert.deepEqual(tops, [{ top: 0, behavior: 'auto' }]); assert.equal(revealed.length, 0);
    await act(() => { host.querySelector<HTMLButtonElement>('#fail')!.click(); root.unmount(); }); await tick(); assert.equal(revealed.length, 0);
  } finally { await act(() => root.unmount()); host.remove(); reduced = false; }
});
