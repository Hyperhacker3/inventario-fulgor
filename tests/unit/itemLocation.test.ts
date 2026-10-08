import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { ItemDetailContent } from '../../src/components/ItemDetailModal';
import { CLOSE_DURATION } from '../../src/components/ui/Motion';
import { changedItemLocation, itemLocationColumns, itemLocationDraft } from '../../src/domain/itemLocation';
import { mapElemento } from '../../src/data/mappers';
import type { Almacen, Estanteria, Caja, Elemento } from '../../src/types';

const warehouses: Almacen[] = ['Norte', 'Sur'].map((nombre, index) => ({ id: `w${index + 1}`, nombre, codigo: nombre, ciudad: '', capacidadPorcentaje: 0, estado: 'Operativo' }));
const racks: Estanteria[] = [{ id: 'r1', almacenId: 'w1', nombre: 'A', codigo: 'A' }, { id: 'r2', almacenId: 'w2', nombre: 'B', codigo: 'B' }];
const boxes: Caja[] = [{ id: 'b1', estanteriaId: 'r1', codigoCaja: 'Caja A', estado: 'Completa' }, { id: 'b2', estanteriaId: 'r2', codigoCaja: 'Caja B', estado: 'Completa' }];
const item = mapElemento({ id: 'MAT-1', codigo: 'MAT001', nombre: 'Material', cantidad: 12, unidad: 'UND', almacen_id: 'w1', estanteria_id: 'r1', caja_id: 'b1' });
test('location edits preserve unchanged columns and explicitly clear dependent database IDs with null', () => {
  assert.deepEqual(changedItemLocation(itemLocationDraft(item), item), {});
  assert.deepEqual(itemLocationColumns({ nombre: 'Otro nombre' }), {});
  const changed = changedItemLocation({ warehouseId: 'w2', rackId: '', levelId: '', boxId: '' }, item);
  assert.deepEqual(itemLocationColumns(changed), { almacen_id: 'w2', estanteria_id: null, nivel_id: null, caja_id: null });
  assert.deepEqual(itemLocationColumns(changedItemLocation(itemLocationDraft(), item)), { almacen_id: null, estanteria_id: null, nivel_id: null, caja_id: null });
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const editor = () => document.querySelector<HTMLElement>('[data-motion-open="true"] [data-item-edit-dialog]');
const editForm = () => editor()?.querySelector<HTMLFormElement>('form') || null;
const button = (host: HTMLElement, text: string) => [...(editor()?.querySelectorAll<HTMLButtonElement>('button') || []), ...host.querySelectorAll<HTMLButtonElement>('button')].find(value => (value.getAttribute('aria-label') || value.textContent?.trim()) === text)!;
const until = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 100 && !condition(); attempt++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(condition(), 'The browser history event must finish before continuing');
};
const field = (host: HTMLElement, label: string) => {
  const target = [...(editor() || host).querySelectorAll<HTMLLabelElement>('label')].find(value => value.textContent === label)!;
  return document.getElementById(target.htmlFor) as HTMLButtonElement;
};
const native = (host: HTMLElement, label: string) => document.getElementById(`${field(host, label).id}-value`) as HTMLSelectElement;
const choose = async (host: HTMLElement, label: string, value: string) => {
  const control = field(host, label);
  await act(() => control.click());
  const options = document.getElementById(`${control.id}-options`)!;
  const target = [...options.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(option => option.dataset.value === value)!;
  assert.ok(target); await act(() => target.click());
};
function inventory(updateElemento: (id: string, updates: Partial<Elemento>) => Promise<void>, role = 'admin') {
  return { user: { name: 'Admin', email: 'test@app.test', role, avatar: '' }, almacenes: warehouses, estanterias: racks, niveles: [], cajas: boxes,
    updateElemento, deleteElemento: async () => {}, getLocationString: () => 'Norte > A > Caja A', categoryLabel: (id: string) => id,
    openQuickMovement: () => {}, addToDispatchCart: () => {} };
}
test('editing preselects the current location, offers only existing compatible locations and cancel discards relocation', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let saves = 0;
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => {}, inventory: inventory(async () => { saves++; }) })));
    await act(() => button(host, 'Editar').click());
    assert.equal(native(host, 'Almacén').value, 'w1'); assert.equal(native(host, 'Estantería').value, 'r1'); assert.equal(native(host, 'Caja').value, 'b1');
    assert.deepEqual([...native(host, 'Caja').options].map(option => option.value), ['', 'b1']);
    assert.equal(editor()!.querySelector('option[value^="__NEW"]'), null);
    await choose(host, 'Almacén', 'w2');
    assert.equal(native(host, 'Estantería').value, ''); assert.equal(native(host, 'Caja').value, ''); assert.equal(field(host, 'Caja').disabled, true);
    assert.deepEqual([...native(host, 'Estantería').options].map(option => option.value), ['', 'r2']);
    await choose(host, 'Estantería', 'r2'); await choose(host, 'Caja', 'b2');
    await act(() => button(host, 'Cancelar').click());
    await act(() => button(host, 'Editar').click());
    assert.equal(native(host, 'Almacén').value, 'w1'); assert.equal(native(host, 'Caja').value, 'b1'); assert.equal(saves, 0);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('save submits all three location IDs once, preserves a failed draft and closes only after success', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let calls = 0, fail!: (cause: Error) => void;
  const request = new Promise<void>((_resolve, reject) => { fail = reject; });
  const payloads: Partial<Elemento>[] = [];
  const update = async (id: string, updates: Partial<Elemento>) => { assert.equal(id, item.id); calls++; payloads.push(updates); if (calls === 1) await request; };
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => {}, inventory: inventory(update) })));
    await act(() => button(host, 'Editar').click());
    await choose(host, 'Almacén', 'w2'); await choose(host, 'Estantería', 'r2'); await choose(host, 'Caja', 'b2');
    const priceLabel = [...editor()!.querySelectorAll<HTMLLabelElement>('label')].find(label => label.textContent?.includes('(COP)'))!;
    const price = document.getElementById(priceLabel.htmlFor) as HTMLInputElement;
    await act(() => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(price, '12500.5');
      price.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    const submit = () => editForm()!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await act(() => { submit(); submit(); }); assert.equal(calls, 1);
    assert.equal(field(host, 'Almacén').disabled, true);
    assert.deepEqual([payloads[0].almacenId, payloads[0].estanteriaId, payloads[0].cajaId], ['w2', 'r2', 'b2']);
    assert.equal(payloads[0].cantidad, undefined);
    assert.equal(payloads[0].valorUnitario, 12500.5);
    await act(async () => fail(new Error('Sin conexión')));
    assert.match(editor()!.querySelector('[role="alert"]')!.textContent!, /Sin conexión/); assert.equal(native(host, 'Caja').value, 'b2');
    await act(async () => { submit(); }); assert.equal(calls, 2);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, CLOSE_DURATION + 30)); });
    assert.equal(document.querySelector('#item-edit-form'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('editing opens in its own dialog above the unchanged detail with independent scroll and Back dismissal', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose() {}, inventory: inventory(async () => {}) })));
    const scroll = host.querySelector<HTMLElement>('.item-detail-scroll')!;
    scroll.scrollTop = 500;
    assert.ok([...host.querySelectorAll('.item-detail-actions button')].every(control => control.classList.contains('ui-flat-choice')));
    assert.deepEqual([...host.querySelectorAll('.item-detail-actions button')].map(control => control.getAttribute('data-action')), ['edit', 'entry', 'adjustment', 'dispatch', 'archive']);
    await act(() => button(host, 'Editar').click());
    assert.equal(scroll.scrollTop, 500); assert.ok(editor()!.querySelector('h2 [data-icon="edit"]'));
    assert.equal(editor()!.querySelector<HTMLElement>('.item-edit-scroll')!.scrollTop, 0);
    assert.equal(document.activeElement, editor()!.querySelector('h2'));
    assert.equal(host.contains(editor()), false);
    assert.equal(editor()!.querySelector('.item-detail-actions, .item-detail-data, .item-detail-stock'), null);
    assert.ok(host.querySelector('.item-detail-data'));
    assert.equal(host.querySelector('section')!.hasAttribute('inert'), true);
    assert.equal(button(host, 'Editar').getAttribute('aria-pressed'), 'true');
    assert.equal(button(host, 'Editar').querySelector('[data-icon]')!.getAttribute('data-filled'), 'true');
    assert.equal(button(host, 'Entrada').disabled, true);
    assert.equal(button(host, 'Cancelar').getAttribute('data-action'), 'cancel');
    assert.equal(button(host, 'Guardar').getAttribute('data-action'), 'edit');
    await act(async () => { window.history.back(); await until(() => !editor()); });
    assert.equal(editor(), null);
    assert.ok(host.querySelector('.item-detail-data')); assert.equal(scroll.scrollTop, 500);
    assert.equal(host.querySelector('section')!.hasAttribute('inert'), false);
    assert.equal(button(host, 'Editar').getAttribute('aria-pressed'), 'false');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('editor close, Cancel and Escape dismiss only editing and preserve the parent detail', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let closes = 0;
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => { closes++; }, inventory: inventory(async () => {}) })));
    const detail = host.querySelector('.item-detail-data');
    for (const method of ['close', 'cancel', 'escape']) {
      await act(() => button(host, 'Editar').click());
      const layer = editor()!.closest<HTMLElement>('.ui-modal-layer')!;
      await act(() => {
        if (method === 'escape') document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        else button(host, method === 'close' ? 'Cerrar edición' : 'Cancelar').click();
      });
      assert.equal(editor(), null); assert.equal(closes, 0); assert.equal(host.querySelector('.item-detail-data'), detail);
      assert.equal(layer.dataset.motionOpen, 'false'); assert.equal(layer.inert, true);
      assert.equal(button(host, 'Editar').getAttribute('aria-pressed'), 'false');
    }
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('detail actions stay selected only while their matching window is open', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const services = inventory(async () => {});
  const render = (overlays: { quickMovementItem?: Elemento | null; quickMovementType?: 'ENTRADA' | 'AJUSTE'; dispatchSelection?: { itemId: string; token: string } | null } = {}) =>
    act(() => root.render(h(ItemDetailContent, { item, onClose() {}, inventory: { ...services, ...overlays } })));
  const selected = () => [...host.querySelectorAll('.item-detail-actions [aria-pressed="true"]')].map(control => control.getAttribute('data-action'));
  try {
    await render(); assert.deepEqual(selected(), []);
    await render({ quickMovementItem: item, quickMovementType: 'ENTRADA' });
    assert.deepEqual(selected(), ['entry']); assert.equal(button(host, 'Entrada').querySelector('[data-icon]')!.getAttribute('data-filled'), 'true');
    await render(); assert.deepEqual(selected(), []);
    await render({ quickMovementItem: item, quickMovementType: 'AJUSTE' }); assert.deepEqual(selected(), ['adjustment']);
    await render({ quickMovementItem: { ...item, id: 'OTHER' }, quickMovementType: 'AJUSTE' }); assert.deepEqual(selected(), []);
    await render({ dispatchSelection: { itemId: item.id, token: 'quantity' } }); assert.deepEqual(selected(), ['dispatch']);
    await render({ dispatchSelection: { itemId: 'OTHER', token: 'quantity' } }); assert.deepEqual(selected(), []);
    await render(); await act(() => button(host, 'Archivar').click()); assert.deepEqual(selected(), ['archive']);
    await act(() => document.querySelector<HTMLButtonElement>('[data-dialog-close]:not([aria-label])')!.click());
    assert.deepEqual(selected(), []);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('read-only and archived product details do not expose the edit form', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    for (const props of [{ item, inventory: inventory(async () => {}, 'consulta') }, { item: { ...item, archived: true }, inventory: inventory(async () => {}) }]) {
      await act(() => root.render(h(ItemDetailContent, { ...props, onClose: () => {} })));
      assert.equal(button(host, 'Editar'), undefined); assert.equal(host.querySelector('form'), null);
    }
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('icon actions retain movement, dispatch and archive semantics and the single close control survives data refresh and scrolling', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let closes = 0, archived = 0;
  const movements: string[] = [], dispatched: string[] = [];
  const services = { ...inventory(async () => {}),
    openQuickMovement: (_item: Elemento, kind: string) => { movements.push(kind); },
    addToDispatchCart: (selected: Elemento) => { dispatched.push(selected.id); },
    deleteElemento: async () => { archived++; },
  };
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => { closes++; }, inventory: services })));
    assert.equal(host.querySelectorAll('[aria-label="Cerrar detalle"]').length, 1);
    assert.equal(host.querySelector('footer'), null);
    const actionIcons = [...host.querySelectorAll('.item-detail-actions [data-icon]')];
    assert.deepEqual(actionIcons.map(icon => icon.getAttribute('data-icon')), ['edit', 'input', 'tune', 'add_shopping_cart', 'archive']);
    assert.ok(actionIcons.every(icon => icon.getAttribute('aria-hidden') === 'true' && icon.getAttribute('data-filled') === 'false'));
    assert.equal(button(host, 'Editar').querySelector('svg') !== null, true);
    await act(() => button(host, 'Entrada').click());
    await act(() => button(host, 'Ajuste').click());
    await act(() => button(host, 'Agregar a la salida').click());
    assert.deepEqual(movements, ['ENTRADA', 'AJUSTE']); assert.deepEqual(dispatched, [item.id]);
    await act(() => button(host, 'Archivar').click()); assert.equal(archived, 0);
    await act(() => document.querySelector<HTMLButtonElement>('[data-dialog-close]:not([aria-label])')!.click());
    const close = button(host, 'Cerrar detalle');
    await act(() => root.render(h(ItemDetailContent, { item: { ...item, cantidad: 15 }, onClose: () => { closes += 2; }, inventory: services })));
    const scroll = host.querySelector<HTMLElement>('.item-detail-scroll')!;
    await act(() => { scroll.scrollTop = 300; scroll.dispatchEvent(new dom.window.Event('scroll')); });
    assert.equal(button(host, 'Cerrar detalle'), close); assert.equal(scroll.contains(close), false);
    await act(() => close.click()); assert.equal(closes, 2);
    await act(() => button(host, 'Archivar').click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(button=>button.textContent==='Archivar producto')!.click()); assert.equal(archived, 1); assert.equal(closes, 4);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('archive confirmation cancels safely, prevents duplicate writes and preserves errors for retry', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let calls = 0, closes = 0, fail = true, finish: (() => void) | undefined;
  const services = { ...inventory(async () => {}), deleteElemento: async () => {
    calls++; await new Promise<void>(resolve => { finish = resolve; }); if (fail) throw new Error('Sin conexión');
  } };
  const confirmation = () => document.querySelector<HTMLElement>('[data-motion-open="true"] [aria-labelledby="archive-confirm-title"]')!;
  const confirm = () => [...confirmation().querySelectorAll<HTMLButtonElement>('button')].find(control => control.textContent === 'Archivar producto')!;
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => { closes++; }, inventory: services })));
    await act(() => button(host, 'Archivar').click());
    assert.equal(host.querySelector('section')!.hasAttribute('inert'), true);
    await act(async () => { window.history.back(); await until(() => !confirmation()); });
    assert.equal(confirmation(), null); assert.equal(calls, 0); assert.equal(closes, 0);
    await act(() => button(host, 'Archivar').click());
    await act(() => { confirm().click(); confirm().click(); });
    assert.equal(calls, 1); assert.equal(confirmation().getAttribute('aria-busy'), 'true');
    const pushState = window.history.pushState;
    let restored = false;
    window.history.pushState = (...args) => { pushState.apply(window.history, args); restored = true; };
    try {
      await act(async () => { window.history.back(); await until(() => restored); });
    } finally { window.history.pushState = pushState; }
    assert.ok(confirmation()); assert.equal(closes, 0);
    await act(async () => finish!());
    assert.match(confirmation().querySelector('[role="alert"]')!.textContent!, /Sin conexión/);
    assert.equal(confirm().disabled, false); assert.equal(closes, 0);
    fail = false; await act(() => confirm().click()); await act(async () => finish!());
    assert.equal(calls, 2); assert.equal(closes, 1); assert.equal(confirmation(), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('product detail dismisses on outside click or touch-generated click but not on its content or a portaled selector', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let closed = 0;
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => { closed++; }, inventory: inventory(async () => {}) })));
    await act(() => host.querySelector<HTMLElement>('[role="dialog"]')!.click()); assert.equal(closed, 0);
    await act(() => button(host, 'Editar').click());
    await choose(host, 'Almacén', 'w2'); assert.equal(closed, 0);
    const backdrop = host.querySelector<HTMLElement>('[role="presentation"]')!;
    await act(() => backdrop.click()); assert.equal(closed, 0);
    await act(() => editor()!.closest<HTMLElement>('.ui-modal-layer')!.click());
    assert.equal(editor(), null); assert.equal(closed, 0);
    await act(() => backdrop.click()); assert.equal(closed, 1);
    await act(() => backdrop.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); assert.equal(closed, 2);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('editing creates rack, level and box in sequence, preserves failed drafts and prevents incomplete or concurrent product saves', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const saved: Partial<Elemento>[] = [];
  let rackCalls = 0, closed = 0;
  let completeRack!: (rack: Estanteria) => void;
  const rackRequest = new Promise<Estanteria>(resolve => { completeRack = resolve; });
  const createdRack: Estanteria = { id: 'r3', almacenId: 'w2', codigo: 'EST-N', nombre: 'Nueva' };
  const services = { ...inventory(async (_id, change) => { saved.push(change); }),
    addEstanteria: async (input: Omit<Estanteria, 'id'>) => {
      rackCalls++; assert.equal(input.almacenId, 'w2');
      if (rackCalls === 1) throw new Error('Sin conexión');
      return rackRequest;
    },
    addNivel: async (input: Omit<import('../../src/types').NivelEstanteria, 'id'>) => { assert.equal(input.estanteriaId, 'r3'); return { ...input, id: 'l3' }; },
    addCaja: async (input: Omit<Caja, 'id'>) => { assert.equal(input.estanteriaId, 'r3'); assert.equal(input.nivelId, 'l3'); return { ...input, id: 'b3' }; },
  };
  const type = async (label: string, value: string) => {
    const element = [...editor()!.querySelectorAll('label')].find(node => node.textContent === label)!;
    const input = document.getElementById(element.htmlFor) as HTMLInputElement;
    await act(() => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
  };
  const submit = () => editForm()!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  try {
    await act(() => root.render(h(ItemDetailContent, { item, onClose: () => { closed++; }, inventory: services })));
    await act(() => button(host, 'Editar').click());
    assert.equal(native(host, 'Caja').value, 'b1'); // Legacy box remains selectable without a level.
    assert.equal([...native(host, 'Caja').options].find(option => option.value === '__NEW_BOX__')!.disabled, true);
    await choose(host, 'Almacén', 'w2'); await choose(host, 'Estantería', '__NEW_RACK__');
    await type('Código de la nueva estantería', 'est-n'); await type('Nombre de la nueva estantería', 'Nueva');
    assert.equal(button(host, 'Guardar').disabled, true);
    await act(() => { submit(); }); assert.equal(saved.length, 0);
    await act(async () => button(host, 'Crear y elegir estantería').click());
    assert.match(editor()!.textContent!, /Sin conexión/);
    assert.equal((editor()!.querySelector('input[id$="input-nueva-estanteria-codigo"]') as HTMLInputElement).value, 'est-n');
    await act(async () => { const create = button(host, 'Crear y elegir estantería'); create.click(); create.click(); }); assert.equal(rackCalls, 2);
    assert.equal(button(host, 'Cerrar detalle').disabled, true); assert.equal(button(host, 'Cancelar').disabled, true);
    assert.equal(button(host, 'Cerrar edición').disabled, true);
    await act(() => editor()!.closest<HTMLElement>('.ui-modal-layer')!.click()); assert.ok(editor());
    await act(() => host.querySelector<HTMLElement>('[role="presentation"]')!.click()); assert.equal(closed, 0);
    await act(async () => { completeRack(createdRack); await rackRequest; });
    assert.equal(native(host, 'Estantería').value, 'r3');
    await choose(host, 'Nivel de estantería', '__NEW_LEVEL__');
    await type('Código del nuevo nivel', 'niv-n'); await type('Nombre del nuevo nivel', 'Superior');
    await act(async () => button(host, 'Crear y elegir nivel').click()); assert.equal(native(host, 'Nivel de estantería').value, 'l3');
    await choose(host, 'Caja', '__NEW_BOX__'); await type('Código de la nueva caja', 'caj-n');
    await act(async () => button(host, 'Crear y elegir caja').click()); assert.equal(native(host, 'Caja').value, 'b3');
    assert.equal(button(host, 'Guardar').disabled, false);
    await act(async () => { submit(); }); assert.equal(saved.length, 1);
    assert.deepEqual([saved[0].almacenId, saved[0].estanteriaId, saved[0].nivelId, saved[0].cajaId], ['w2', 'r3', 'l3', 'b3']);
    assert.equal(saved[0].cantidad, undefined);
  } finally { await act(() => root.unmount()); host.remove(); }
});
