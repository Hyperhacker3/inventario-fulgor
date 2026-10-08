import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { NumberInput } from '../../src/components/NumberInput';
import { CLOSE_DURATION } from '../../src/components/ui/Motion';
import { useViewNavigation } from '../../src/state/useViewNavigation';
import { useInventoryViewMode } from '../../src/state/useInventoryViewMode';
import { sessionIdentity, shouldClearSessionCache } from '../../src/domain/session';
import { useCamera } from '../../src/shared/useCamera';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { DispatchQuantityModal } = await import('../../src/components/dispatch/DispatchQuantityModal');
const { mapElemento } = await import('../../src/data/mappers');
const { ItemBoxSelector } = await import('../../src/components/item/ItemBoxSelector');
const { ItemCategorySelector } = await import('../../src/components/item/ItemCategorySelector');
const { ItemRackSelector } = await import('../../src/components/item/ItemRackSelector');
const { ItemPrefixSelector } = await import('../../src/components/item/ItemPrefixSelector');
const { EntryForm } = await import('../../src/components/entry/EntryForm');
const { ArchivedItemDeletion } = await import('../../src/components/administration/ArchivedItemDeletion');
const { ArchivedItemActions } = await import('../../src/components/administration/ArchivedItemActions');
const { MovementDocuments } = await import('../../src/components/history/MovementDocuments');


async function chooseVisible(host: HTMLElement, value: string) {
  await act(() => host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
  const option = document.querySelector<HTMLButtonElement>(`[role="option"][data-value="${value}"]`)!;
  assert.ok(option, 'The custom list presents the creation option');
  await act(() => option.click());
}

test('unarchiving is available only for archived items, guards concurrent deletion and allows retry after a failure', async () => {
  const active = mapElemento({id:'MAT-1',codigo:'MAT001',nombre:'Material',archived:false});
  const archived = { ...active, archived:true };
  let calls = 0, deleted = 0;
  let fail!: (cause: Error) => void;
  const request = new Promise<void>((_resolve, reject) => { fail = reject; });
  const onRestore = async (value: import('../../src/types').Elemento) => {
    assert.equal(value.id, archived.id); calls++; if (calls === 1) await request;
  };
  const onDelete = async () => { deleted++; };
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(createElement(ArchivedItemActions, {item:active,onRestore,onDelete})));
    assert.equal(host.querySelector('button'), null);
    await act(() => root.render(createElement(ArchivedItemActions, {item:archived,onRestore,onDelete})));
    await act(() => { const button = host.querySelector('button')!; button.click(); button.click(); });
    assert.equal(calls, 1); assert.equal(host.querySelector('fieldset')!.disabled, true);
    await act(() => host.querySelectorAll<HTMLButtonElement>('button')[1].click());
    assert.equal(deleted, 0);
    await act(async () => fail(new Error('Conexión interrumpida')));
    assert.match(host.querySelector('[role="alert"]')!.textContent!, /Conexión interrumpida/);
    assert.equal(host.querySelector('fieldset')!.disabled, false);
    await act(async () => host.querySelector('button')!.click());
    assert.equal(calls, 2); assert.equal(deleted, 0);
    assert.equal(host.querySelector('[role="alert"]'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('history routes PDF and photo actions separately to the same remission and omits them for entries',async()=>{
  const events:string[]=[];
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const props={onPdf:(id:string)=>events.push(`pdf:${id}`),onPhotos:(id:string)=>events.push(`photos:${id}`)};
  try{
    await act(()=>root.render(createElement(MovementDocuments,props)));assert.equal(host.querySelectorAll('button').length,0);
    await act(()=>root.render(createElement(MovementDocuments,{...props,remissionId:'REM-1'})));
    await act(()=>{host.querySelector<HTMLButtonElement>('[aria-label="Ver remisión PDF"]')!.click();host.querySelector<HTMLButtonElement>('[aria-label="Ver fotografías de la salida"]')!.click();});
    assert.deepEqual(events,['pdf:REM-1','photos:REM-1']);
  }finally{await act(()=>root.unmount());host.remove();}
});

test('permanent deletion requires an archived item and exact code, blocks duplicate calls and allows a failed request to retry', async () => {
  const active = mapElemento({id:'MAT-1',codigo:'MAT001',nombre:'Material',archived:false});
  const archived = { ...active,archived:true };
  let calls = 0;
  let fail!: (cause: Error) => void;
  const first = new Promise<void>((_resolve,reject) => { fail=reject; });
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const onDelete = async (item: import('../../src/types').Elemento) => { calls++; assert.equal(item.id,archived.id); assert.equal(item.archived,true); if (calls===1) await first; };
  try {
    await act(() => root.render(createElement(ArchivedItemDeletion,{item:active,onDelete})));
    assert.equal(host.querySelector('button'),null);
    await act(() => root.render(createElement(ArchivedItemDeletion,{item:archived,onDelete})));
    await act(() => host.querySelector('button')!.click());
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    const submit = () => host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    const typeCode = (code: string) => { const input=host.querySelector('input')!; setValue.call(input,code); input.dispatchEvent(new dom.window.Event('input',{bubbles:true})); };
    await act(() => typeCode('OTRO001'));
    await act(() => submit()); assert.equal(calls,0);
    await act(() => typeCode(archived.codigo));
    await act(() => { submit(); submit(); }); assert.equal(calls,1);
    await act(async () => fail(new Error('Conexión interrumpida')));
    assert.match(host.querySelector('[role="alert"]')!.textContent!,/Conexión interrumpida/); assert.equal(host.querySelector('input')!.value,archived.codigo);
    await act(async () => submit()); assert.equal(calls,2);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('entry reception preserves a failed draft and request, blocks double saves and displays the confirmed movement', async () => {
  const item = mapElemento({id:'MAT-1',codigo:'MAT001',nombre:'Material',cantidad:4,unidad:'UND',archived:false});
  let fail = true, calls = 0;
  let complete!: (value: import('../../src/types').HistorialMovimiento) => void;
  const saved = new Promise<import('../../src/types').HistorialMovimiento>(resolve => { complete = resolve; });
  const requests: string[] = [], busy: boolean[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(EntryForm,{ item,responsible:'Operador',onBusyChange:(value: boolean)=>busy.push(value),
      onSave:async (input: import('../../src/components/entry/EntryForm').EntryInput) => {
        calls++; requests.push(input.requestId); assert.equal(input.tipo,'ENTRADA'); assert.equal(input.cantidad,1.125); assert.equal(input.elementoId,item.id);
        assert.equal(input.motivo,'Devolución de obra');
        if (fail) throw new Error('Se perdió la conexión'); return saved;
      } })));
    const inputSet = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    const textSet = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value')!.set!;
    await act(() => {
      const input = host.querySelector('input')!; inputSet.call(input,'1.125'); input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
      const reason = host.querySelector('textarea')!; textSet.call(reason,'Devolución de obra'); reason.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    });
    await act(async () => host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.match(host.querySelector('[role="alert"]')!.textContent!,/Se perdió la conexión/);
    assert.equal(host.querySelector('input')!.value,'1.125'); assert.equal(host.querySelector('textarea')!.value,'Devolución de obra');
    fail = false;
    await act(() => { for (let i=0;i<2;i++) host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})); });
    assert.equal(calls,2); assert.equal(requests[0],requests[1]); assert.equal(host.querySelector('fieldset')!.disabled,true);
    await act(async () => complete({id:'MOV-1',tipo:'ENTRADA',elementoId:item.id,itemCode:item.codigo,itemName:item.nombre,cantidad:1.125,unidad:'und',
      stockAnterior:4,stockNuevo:5.125,motivo:'Devolución de obra',responsable:'Operador',fecha:'2026-10-06',hora:'10:00',docType:'view'}));
    assert.match(host.querySelector('[role="status"]')!.textContent!,/Stock tras este movimiento: 5.125/);
    assert.equal(host.querySelector('input')!.value,'0'); assert.equal(host.querySelector('textarea')!.value,'');
    assert.deepEqual(busy,[true,false,true,false]);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('inline category creation follows the placeholder, selects the saved category and guards duplicate submissions', async () => {
  let calls = 0;
  let complete!: (category: import('../../src/types').Categoria) => void;
  const saved = new Promise<import('../../src/types').Categoria>(resolve => { complete = resolve; });
  const selected: string[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(ItemCategorySelector,{value:'',categories:[],onChange:(id: string)=>selected.push(id),
      onCreate:async (name: string)=>{ calls++; assert.equal(name,'Materiales eléctricos'); return saved; } })));
    const select=host.querySelector('select')!;
    assert.equal(select.options[0].value,'');
    assert.equal(select.options[1].value,'__NEW_CATEGORY__');
    await chooseVisible(host,'__NEW_CATEGORY__');
    const setValue=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => { const input=host.querySelector('input')!; setValue.call(input,'Materiales eléctricos'); input.dispatchEvent(new dom.window.Event('input',{bubbles:true})); });
    await act(() => { host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); });
    assert.equal(calls,1); assert.deepEqual(selected,[]);
    await act(async () => complete({id:'MATERIALES_ELECTRICOS',nombre:'Materiales eléctricos',activo:true}));
    assert.deepEqual(selected,['MATERIALES_ELECTRICOS']); assert.equal(host.querySelector('input')?.closest('[inert]') !== null,true); await act(async () => { await new Promise(resolve => setTimeout(resolve,CLOSE_DURATION + 30)); }); assert.equal(host.querySelector('input'),null);
    assert.match(host.querySelector('[role="status"]')!.textContent!,/guardada en Supabase y seleccionada/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('inline box selection saves in the selected rack, blocks double creation and selects the returned box', async () => {
  const selected: string[] = [], busy: boolean[] = [], drafts: boolean[] = [];
  let calls = 0;
  let complete!: (box: import('../../src/types').Caja) => void;
  const saved = new Promise<import('../../src/types').Caja>(resolve => { complete = resolve; });
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(ItemBoxSelector, { rackId:'RACK-1',levelId:'LEVEL-1',boxId:'',boxes:[],
      onBox:(id: string)=>selected.push(id),onBusyChange:(value: boolean)=>busy.push(value),onDraftChange:(value: boolean)=>drafts.push(value),
      onCreate:async (input: Omit<import('../../src/types').Caja,'id'>) => {
        calls++; assert.equal(input.estanteriaId,'RACK-1'); assert.equal(input.nivelId,'LEVEL-1'); assert.equal(input.codigoCaja,'CAJ-025'); return saved;
      } })));
    const select = host.querySelector('select')!;
    assert.equal(select.options[0].value,'');
    assert.equal(select.options[1].value,'__NEW_BOX__');
    await chooseVisible(host,'__NEW_BOX__');
    const input = host.querySelector('input')!;
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => { setValue.call(input,' caj-025 '); input.dispatchEvent(new dom.window.Event('input',{ bubbles:true })); });
    await act(() => { host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); });
    assert.equal(calls,1); assert.deepEqual(selected,[]); assert.equal(select.disabled,true); assert.deepEqual(busy,[true]);
    await act(async () => complete({ id:'BOX-SERVER',estanteriaId:'RACK-1',nivelId:'LEVEL-1',codigoCaja:'CAJ-025',estado:'Parcial' }));
    assert.deepEqual(selected,['BOX-SERVER']); assert.deepEqual(busy,[true,false]); assert.deepEqual(drafts,[true,false]);
    assert.match(host.querySelector('[role="status"]')!.textContent!,/creada en Supabase/);
    assert.equal(host.querySelector('input')?.closest('[inert]') !== null,true); await act(async () => { await new Promise(resolve => setTimeout(resolve,CLOSE_DURATION + 30)); }); assert.equal(host.querySelector('input'),null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('box creation failures keep the draft and an existing box is selected without another write', async () => {
  let fail = true, calls = 0;
  const selected: string[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const props = { rackId:'RACK-1',levelId:'LEVEL-1',boxId:'',boxes:[],onBox:(id: string)=>selected.push(id),
    onCreate:async (input: Omit<import('../../src/types').Caja,'id'>) => {
      calls++; if (fail) throw new Error('No se pudo conectar'); return { ...input,id:'BOX-SERVER' };
    } };
  try {
    await act(() => root.render(createElement(ItemBoxSelector,props)));
    await chooseVisible(host,'__NEW_BOX__');
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => { const input=host.querySelector('input')!; setValue.call(input,'CAJ-025'); input.dispatchEvent(new dom.window.Event('input',{bubbles:true})); });
    await act(async () => host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click());
    assert.deepEqual(selected,[]); assert.equal(host.querySelector('input')!.value,'CAJ-025');
    assert.match(host.querySelector('[role="alert"]')!.textContent!,/No se pudo conectar/);
    fail=false;
    // A refresh can reveal that this box already exists; retry selects it without duplication.
    await act(() => root.render(createElement(ItemBoxSelector,{ ...props,boxes:[{id:'EXISTING',estanteriaId:'RACK-1',nivelId:'LEVEL-1',codigoCaja:'CAJ-025',estado:'Parcial' as const}] })));
    await act(async () => host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click());
    assert.deepEqual(selected,['EXISTING']); assert.equal(calls,1);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('inline racks require a warehouse, keep failed drafts and select a confirmed rack without double creation', async () => {
  let fail = true, calls = 0;
  const selected: string[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const props = { warehouseId:'',rackId:'',racks:[],onRack:(id: string)=>selected.push(id),
    onCreate:async (input: Omit<import('../../src/types').Estanteria,'id'>) => {
      calls++; assert.equal(input.almacenId,'WAREHOUSE-1'); assert.equal(input.codigo,'EST-025'); assert.equal(input.nombre,'Zona eléctrica');
      if (fail) throw new Error('No se pudo guardar'); return { ...input,id:'RACK-SERVER' };
    } };
  try {
    await act(() => root.render(createElement(ItemRackSelector,props)));
    assert.equal(host.querySelector('select')!.disabled,true);
    assert.equal(host.querySelector('select')!.options[0].value,'');
    assert.equal(host.querySelector('select')!.options[1].value,'__NEW_RACK__');
    await act(() => root.render(createElement(ItemRackSelector,{ ...props,warehouseId:'WAREHOUSE-1' })));
    await chooseVisible(host,'__NEW_RACK__');
    const setValue=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => {
      const inputs=host.querySelectorAll('input');
      setValue.call(inputs[0],' est-025 '); inputs[0].dispatchEvent(new dom.window.Event('input',{bubbles:true}));
      setValue.call(inputs[1],'Zona eléctrica'); inputs[1].dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    });
    await act(async () => host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click());
    assert.deepEqual(selected,[]); assert.match(host.querySelector('[role="alert"]')!.textContent!,/No se pudo guardar/);
    assert.equal(host.querySelectorAll('input')[1].value,'Zona eléctrica');
    fail=false;
    await act(async () => { host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click(); });
    assert.equal(calls,2); assert.deepEqual(selected,['RACK-SERVER']); assert.equal(host.querySelector('input')?.closest('[inert]') !== null,true); await act(async () => { await new Promise(resolve => setTimeout(resolve,CLOSE_DURATION + 30)); }); assert.equal(host.querySelector('input'),null);
    assert.match(host.querySelector('[role="status"]')!.textContent!,/creada en Supabase y seleccionada/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('quantity dialog asks before adding, accepts typed amounts and confirms only once', async () => {
  const item = mapElemento({ id:'EJE001',codigo:'EJE001',nombre:'Elemento',cantidad:100,unidad:'und',especificaciones:{ peso_unitario:{ valor:40,unidad:'g' } } });
  const added: number[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(DispatchQuantityModal,{ item,inCart:0,onConfirm:(quantity: number) => added.push(quantity),onClose:() => {} })));
    assert.deepEqual(added,[]);
    const plus = document.querySelector<HTMLButtonElement>('[aria-label="Aumentar cantidad"]')!;
    const minus = document.querySelector<HTMLButtonElement>('[aria-label="Reducir cantidad"]')!;
    const input = document.querySelector<HTMLInputElement>('#dispatch-add-quantity')!;
    assert.ok(input.classList.contains('ui-number-input'));
    for (const key of ['ArrowUp', 'ArrowDown']) {
      const event = new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await act(() => input.dispatchEvent(event)); assert.equal(event.defaultPrevented, true); assert.equal(input.value, '1');
    }
    await act(() => plus.click()); assert.equal(input.value,'2');
    await act(() => minus.click()); assert.equal(input.value,'1');
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(() => { setValue.call(input,'20'); input.dispatchEvent(new dom.window.Event('input',{ bubbles:true })); });
    assert.match(document.querySelector('[role="dialog"]')!.textContent!,/0,8 kg/);
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    assert.deepEqual(added,[20]);
  } finally { await act(() => root.unmount()); host.remove(); }
});
test('quantity dialog respects stock changes and Escape closes only the selection', async () => {
  const item = mapElemento({ id:'EJE001',codigo:'EJE001',nombre:'Elemento',cantidad:10,unidad:'und' });
  let added = 0, closed = 0, outerEscapes = 0;
  const outer = () => { outerEscapes++; };
  const onClose = () => { closed++; };
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  document.addEventListener('keydown',outer);
  try {
    await act(() => root.render(createElement(DispatchQuantityModal,{ item,inCart:8,onConfirm:() => { added++; },onClose })));
    assert.equal(document.querySelector<HTMLInputElement>('#dispatch-add-quantity')!.max,'2');
    await act(() => root.render(createElement(DispatchQuantityModal,{ item:{ ...item,cantidad:8 },inCart:8,onConfirm:() => { added++; },onClose })));
    assert.equal(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,true);
    await act(() => document.querySelector('form[role="dialog"]')!.dispatchEvent(new dom.window.Event('submit',{ bubbles:true,cancelable:true })));
    assert.equal(added,0);
    await act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{ key:'Escape',bubbles:true })));
    assert.equal(closed,1); assert.equal(outerEscapes,0);
  } finally { document.removeEventListener('keydown',outer); await act(() => root.unmount()); host.remove(); }
});

test('numeric fields can be cleared, require a replacement, and accept zero and decimals', async () => {
  let quantity = 0;
  function Form() {
    const [value, setValue] = useState(0);
    return createElement('form', null, createElement(NumberInput, {
      value, required: true, min: 0, step: '0.001',
      onValueChange: (next: number) => { quantity = next; setValue(next); },
    }));
  }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(Form)));
    const input = host.querySelector('input')!;
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!;
    const type = async (text: string) => {
      await act(() => {
        setValue.call(input, text);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    };
    await type('');
    assert.equal(input.value, '');
    assert.equal(host.querySelector('form')!.checkValidity(), false);
    assert.equal(quantity, 0);
    await type('12.375');
    assert.equal(quantity, 12.375);
    assert.equal(input.value, '12.375');
    const editKey = new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    await act(() => input.dispatchEvent(editKey)); assert.equal(editKey.defaultPrevented, false);
    await type('0');
    assert.equal(quantity, 0);
    assert.equal(host.querySelector('form')!.checkValidity(), true);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('reconfirming the same signed-in account preserves cache; account and role changes clear it', () => {
  const account = { user: { id: 'test-user', app_metadata: { role: 'admin' } } };
  const identity = sessionIdentity(account);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity(account)), false);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity({ user: { id: 'other-user', app_metadata: { role: 'admin' } } })), true);
  assert.equal(shouldClearSessionCache(identity, sessionIdentity({ user: { id: 'test-user', app_metadata: { role: 'consulta' } } })), true);
  assert.equal(shouldClearSessionCache(identity, null), true);
});

test('browser back and forward restore app screens without leaving the app', async () => {
  window.history.replaceState(null, '', '/');
  let navigation!: ReturnType<typeof useViewNavigation>;
  let restored = false;
  const onRestore = () => { restored = true; };
  function Screen() {
    navigation = useViewNavigation(onRestore);
    return createElement('output', null, navigation.activeView);
  }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(() => root.render(createElement(Screen)));
    await act(() => navigation.setActiveView('explorer'));
    await act(() => navigation.setActiveView('history'));
    assert.equal(restored, false);
    const traverse = async (direction: 'back' | 'forward') => {
      await act(async () => {
        const popped = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
        window.history[direction]();
        await popped;
      });
    };
    await traverse('back');
    assert.equal(restored, true);
    assert.equal(host.textContent, 'explorer');
    await traverse('back');
    assert.equal(host.textContent, 'dashboard');
    await traverse('forward');
    assert.equal(host.textContent, 'explorer');
    assert.equal(window.location.origin, 'https://app.test');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('inventory list preference survives leaving and reopening the screen', async () => {
  localStorage.clear();
  let selectMode!: (mode: 'grid' | 'list') => void;
  function View() {
    const [mode, select] = useInventoryViewMode();
    selectMode = select;
    return createElement('output', null, mode);
  }
  const host = document.body.appendChild(document.createElement('div'));
  let root = createRoot(host);
  try {
    await act(() => root.render(createElement(View)));
    await act(() => selectMode('list'));
    await act(() => root.unmount());
    root = createRoot(host);
    await act(() => root.render(createElement(View)));
    assert.equal(host.textContent, 'list');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('PC capture opens the integrated webcam without a rear constraint and switches to any connected camera', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalPlay = dom.window.HTMLMediaElement.prototype.play;
  const requested: MediaStreamConstraints[] = [], stopped: string[] = [];
  const mediaDevices = {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      requested.push(constraints);
      const id = ((constraints.video as MediaTrackConstraints).deviceId as ConstrainDOMStringParameters)?.exact as string || 'integrated';
      const track = {label:id, stop:()=>stopped.push(id),getSettings:()=>({deviceId:id,facingMode:id==='integrated'?'user':undefined})};
      return {getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
    },
    enumerateDevices: async () => [{kind:'videoinput',deviceId:'integrated',label:'Integrated Front Camera'}, {kind:'videoinput',deviceId:'usb',label:'USB Webcam'}],
    addEventListener:()=>{},removeEventListener:()=>{},
  };
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',maxTouchPoints:10}});
  dom.window.HTMLMediaElement.prototype.play = async () => {};
  let camera!: ReturnType<typeof useCamera>;
  function Camera({id}:{id:string}) {camera=useCamera(true,id);return createElement('video',{ref:camera.videoRef});}
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  try {
    await act(async()=>root.render(createElement(Camera,{id:''})));
    assert.equal(camera.rearOnly,false);assert.equal(camera.ready,true);assert.equal(camera.currentDeviceId,'integrated');
    assert.deepEqual(camera.cameras.map(value=>value.id),['integrated','usb']);
    assert.equal((requested[0].video as MediaTrackConstraints).facingMode,undefined);
    await act(async()=>root.render(createElement(Camera,{id:'usb'})));
    assert.equal(camera.ready,true);assert.equal(camera.currentDeviceId,'usb');
    assert.deepEqual((requested[1].video as MediaTrackConstraints).deviceId,{exact:'usb'});
    assert.equal((requested[1].video as MediaTrackConstraints).facingMode,undefined);
    assert.deepEqual(stopped,['integrated']);
  } finally {
    await act(()=>root.unmount());host.remove();dom.window.HTMLMediaElement.prototype.play=originalPlay;
    if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else Reflect.deleteProperty(globalThis,'navigator');
  }
  assert.deepEqual(stopped,['integrated','usb']);
});

test('rear camera selection stops old streams and rejects a front stream even if constraints were ignored', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalPlay = dom.window.HTMLMediaElement.prototype.play;
  const requested: MediaStreamConstraints[] = [];
  const stopped: string[] = [];
  const played: string[] = [];
  const mediaDevices = {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      requested.push(constraints);
      const video = constraints.video as MediaTrackConstraints;
      const id = (video.deviceId as ConstrainDOMStringParameters)?.exact as string || 'wide';
      if (id === 'unavailable') throw Object.assign(new Error('No matching rear camera'), { name: 'OverconstrainedError' });
      const track = { label: id, stop: () => stopped.push(id), getSettings: () => ({ deviceId: id, facingMode: id === 'unknown' ? undefined : id === 'front' ? 'user' : 'environment' }) };
      return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
    },
    enumerateDevices: async () => ['wide', 'tele', 'front', 'unknown'].map(id => ({ kind: 'videoinput', deviceId: id, label: id === 'tele' ? 'Back telephoto' : id === 'front' ? 'Front Camera' : id })),
    addEventListener: () => {}, removeEventListener: () => {},
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices, userAgent: 'Mozilla/5.0 (Linux; Android 16)' } });
  dom.window.HTMLMediaElement.prototype.play = async function () { played.push((this.srcObject as MediaStream).getVideoTracks()[0].getSettings().deviceId || ''); };
  let camera!: ReturnType<typeof useCamera>;
  function Camera({ id }: { id: string }) { camera = useCamera(true, id); return createElement('video', { ref: camera.videoRef }); }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(Camera, { id: '' })));
    assert.deepEqual(camera.cameras.map(device => device.id), ['wide', 'tele']);
    assert.equal(camera.currentDeviceId, 'wide');
    assert.deepEqual((requested[0].video as MediaTrackConstraints).facingMode, { exact: 'environment' });
    await act(async () => root.render(createElement(Camera, { id: 'tele' })));
    assert.deepEqual((requested[1].video as MediaTrackConstraints).deviceId, { exact: 'tele' });
    assert.deepEqual((requested[1].video as MediaTrackConstraints).facingMode, { exact: 'environment' });
    assert.deepEqual(camera.cameras.map(device => device.id), ['wide', 'tele']);
    assert.deepEqual(stopped, ['wide']);
    await act(async () => root.render(createElement(Camera, { id: 'front' })));
    assert.equal(camera.ready, false);
    assert.equal(camera.currentDeviceId, '');
    assert.match(camera.error, /cámara trasera/);
    assert.deepEqual(played, ['wide', 'tele']);
    assert.deepEqual(stopped, ['wide', 'tele', 'front']);
    await act(async () => root.render(createElement(Camera, { id: 'unknown' })));
    assert.equal(camera.ready, false);
    assert.match(camera.error, /cámara trasera/);
    assert.deepEqual(stopped, ['wide', 'tele', 'front', 'unknown']);
    await act(async () => root.render(createElement(Camera, { id: 'unavailable' })));
    assert.equal(camera.ready, false);
    assert.match(camera.error, /No hay una cámara trasera disponible/);
    assert.equal(requested.length, 5);
    assert.deepEqual(played, ['wide', 'tele']);
    await act(async () => root.render(createElement(Camera, { id: '' })));
    assert.equal(camera.ready, true);
    assert.equal(camera.error, '');
    assert.equal(camera.currentDeviceId, 'wide');
    assert.deepEqual(played, ['wide', 'tele', 'wide']);
  } finally {
    await act(() => root.unmount()); host.remove();
    dom.window.HTMLMediaElement.prototype.play = originalPlay;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
  assert.deepEqual(stopped, ['wide', 'tele', 'front', 'unknown', 'wide']);
});


test('inline prefixes allow only three letters, wait for server confirmation and prevent duplicate creation', async () => {
  const selected: string[] = [], busy: boolean[] = [], drafts: boolean[] = [];
  let calls=0;
  let complete!: (value: import('../../src/types').PrefijoCodigo) => void;
  const saved=new Promise<import('../../src/types').PrefijoCodigo>(resolve=>{complete=resolve;});
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const props={value:'',prefixes:[],onChange:(id:string)=>selected.push(id),onBusyChange:(value:boolean)=>busy.push(value),onDraftChange:(value:boolean)=>drafts.push(value),
    onCreate:async(code:string)=>{calls++;assert.equal(code,'CAB');return saved;}};
  try {
    await act(()=>root.render(createElement(ItemPrefixSelector,props)));
    const select=host.querySelector('select')!;
    assert.equal(select.options[0].value,'');assert.equal(select.options[1].value,'__NEW_PREFIX__');
    await chooseVisible(host,'__NEW_PREFIX__');
    const input=host.querySelector('input')!;
    const setValue=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    const type=(value:string)=>{setValue.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
    const button=host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!;
    await act(()=>type('c1a'));assert.equal(input.value,'CA');assert.equal(button.disabled,true);
    await act(()=>type('ca-b123d'));assert.equal(input.value,'CAB');assert.equal(button.disabled,false);
    await act(()=>{button.click();button.click();});assert.equal(calls,1);assert.deepEqual(selected,[]);assert.equal(select.disabled,true);
    await act(async()=>complete({id:'SERVER-ID',prefijo:'CAB',nombre:'CAB',activo:true,ultimo:0}));
    assert.deepEqual(selected,['SERVER-ID']);assert.deepEqual(busy,[true,false]);assert.deepEqual(drafts,[true,false]);
    assert.match(host.querySelector('[role="status"]')!.textContent!,/guardado en Supabase y seleccionado/);
  } finally {await act(()=>root.unmount());host.remove();}
});

test('failed prefix creation retains its draft and selecting an existing code does not write anything', async () => {
  let calls=0;const selected:string[]=[];
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const props={value:'',prefixes:[{id:'EXISTING',prefijo:'CAB',nombre:'Cables',activo:true,ultimo:100}],
    onChange:(id:string)=>selected.push(id),onBusyChange:()=>{},onDraftChange:()=>{},
    onCreate:async()=>{calls++;throw new Error('Conexión interrumpida');}};
  try {
    await act(()=>root.render(createElement(ItemPrefixSelector,props)));
    await chooseVisible(host,'EXISTING');assert.deepEqual(selected,['EXISTING']);assert.equal(calls,0);
    await chooseVisible(host,'__NEW_PREFIX__');
    const input=host.querySelector('input')!;
    const setValue=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(()=>{setValue.call(input,'EST');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
    await act(async()=>host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!.click());
    assert.equal(calls,1);assert.equal(input.value,'EST');assert.match(host.querySelector('[role="alert"]')!.textContent!,/Conexión interrumpida/);
    assert.deepEqual(selected,['EXISTING']);assert.equal(host.querySelector('select')!.disabled,false);
  } finally {await act(()=>root.unmount());host.remove();}
});
