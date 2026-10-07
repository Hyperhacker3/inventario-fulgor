import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useRef } from 'react';
import { navigationItems, navigationIsActive, quickNavigationItems } from '../../src/domain/navigation';
import { MobileMenu } from '../../src/components/navigation/MobileMenu';
import { MobileBottomNav } from '../../src/components/navigation/MobileBottomNav';
import { keyboardIsVisible, useMobileKeyboard } from '../../src/hooks/useMobileKeyboard';
import { useDialogFocus } from '../../src/hooks/useDialogFocus';
import { ItemPhotoPicker } from '../../src/components/ItemPhotoPicker';
import { OutgoingPhotoPicker } from '../../src/components/dispatch/OutgoingPhotoPicker';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');

test('photo editor preserves promotion, removal and disabled controls with multiple images', async () => {
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  let main='https://images.test/main.jpg',additional=['https://images.test/a.jpg','https://images.test/b.jpg'];
  const render=(disabled=false)=>createElement(ItemPhotoPicker,{value:main,additional,disabled,onChange:(value:string)=>{main=value;},onAdditionalChange:(value:string[])=>{additional=value;}});
  try {
    await act(()=>root.render(render()));
    assert.equal(host.querySelectorAll('img').length,3);
    await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Usar foto 1 como principal"]')!.click());
    assert.equal(main,'https://images.test/a.jpg');
    assert.deepEqual(additional,['https://images.test/main.jpg','https://images.test/b.jpg']);
    await act(()=>root.render(render()));
    await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Quitar foto adicional 2"]')!.click());
    assert.deepEqual(additional,['https://images.test/main.jpg']);
    await act(()=>root.render(render(true)));
    const remove=host.querySelector<HTMLButtonElement>('[aria-label="Quitar foto adicional 1"]')!;
    assert.equal(remove.matches(':disabled'),true);
    await act(()=>remove.click());assert.equal(additional.length,1);
    await act(()=>root.render(createElement(OutgoingPhotoPicker,{photos:['https://images.test/evidence.jpg'],onChange:value=>{additional=value;},onBusyChange:()=>{}})));
    const evidencePanel = host.querySelector('fieldset')!;
    assert.equal(evidencePanel.querySelector('legend'), null);
    assert.equal(evidencePanel.querySelector('h3')!.id, evidencePanel.getAttribute('aria-labelledby'));
    await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Quitar foto de salida 1"]')!.click());
    assert.deepEqual(additional,[]);
  } finally {await act(()=>root.unmount());host.remove();}
});

test('quick navigation has at most four actions while the complete menu retains every permitted screen', () => {
  assert.deepEqual(quickNavigationItems('admin', 3).map(item => item.id), ['dashboard','explorer','entries','dispatch']);
  assert.equal(quickNavigationItems('operador', 3).at(-1)?.badge, 3);
  assert.deepEqual(quickNavigationItems('consulta').map(item => item.id), ['dashboard','explorer']);
  assert.equal(navigationItems('admin').length, 9);
  assert.equal(navigationItems('operador').some(item => item.id === 'new-item'), false);
  assert.equal(navigationItems('consulta').some(item => ['new-item','entries','dispatch'].includes(item.id)), false);
  assert.equal(navigationIsActive(navigationItems('admin').find(item => item.id === 'data-admin')!, 'projects'), true);
});

test('icon-only bottom navigation keeps accessible destinations, active selection and dispatch badge', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const navigated: string[] = [];
  try {
    await act(() => root.render(createElement(MobileBottomNav, { items: quickNavigationItems('admin', 3), activeView: 'explorer', keyboardOpen: false, onNavigate: view => { navigated.push(view); } })));
    const controls = [...host.querySelectorAll<HTMLButtonElement>('button')];
    assert.deepEqual(controls.map(control => control.getAttribute('aria-label')), ['Inicio', 'Inventario', 'Entradas', 'Salidas']);
    assert.equal(controls[1].getAttribute('aria-current'), 'page');
    for (const control of controls) { assert.equal(control.querySelector('.material-symbols-outlined')!.getAttribute('aria-hidden'), 'true'); await act(() => control.click()); }
    assert.deepEqual(navigated, ['dashboard', 'explorer', 'entries', 'dispatch']);
    assert.match(controls[3].textContent!, /3/);
    assert.doesNotMatch(host.textContent!, /Inicio|Inventario|Entradas|Salidas/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('overlay menu closes outside or with Escape, traps focus, and preserves input focus across data updates', async () => {
  let closed = 0, latest = 0, selected = '';
  const trigger = document.body.appendChild(document.createElement('button'));
  trigger.focus();
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const props = { items:navigationItems('admin',2), activeView:'explorer' as const, search:'', onSearch:()=>{}, onNavigate:(view:string)=>{selected=view;}, onHelp:()=>{}, onSignOut:()=>{} };
  try {
    await act(()=>root.render(createElement(MobileMenu,{...props,open:false,onClose:()=>{closed++;}})));
    assert.ok(document.querySelector('[aria-hidden="true"][inert]'));
    assert.equal(document.querySelector('.mobile-menu-layer')!.parentElement, document.body);
    assert.equal(host.querySelector('[role="dialog"]'), null);
    await act(()=>root.render(createElement(MobileMenu,{...props,open:true,onClose:()=>{closed++;}})));
    const close=document.querySelector<HTMLButtonElement>('[data-dialog-close]')!;
    assert.equal(document.activeElement,close);
    const input=document.querySelector<HTMLInputElement>('input')!;
    input.focus();
    await act(()=>root.render(createElement(MobileMenu,{...props,search:'CAB',open:true,onClose:()=>{latest++;}})));
    assert.equal(document.activeElement,input); assert.equal(input.value,'CAB');
    // Sign-out is the final focusable control.
    const controls=document.querySelectorAll<HTMLButtonElement>('section button');
    controls[controls.length-1].focus();
    await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));
    assert.equal(document.activeElement,close);
    await act(()=>document.querySelector<HTMLButtonElement>('[aria-label="Cerrar menú al tocar fuera"]')!.click());
    assert.equal(latest,1); assert.equal(closed,0);
    await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(latest,2);
    await act(()=>document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(selected,'explorer');
    await act(()=>root.render(createElement(MobileMenu,{...props,open:false,onClose:()=>{latest++;}})));
    assert.equal(document.activeElement,trigger);
  } finally {await act(()=>root.unmount());host.remove();trigger.remove();}
});

test('Escape closes only the focused nested dialog, and closing it restores the parent control', async () => {
  let parentClosed=0, childClosed=0;
  function Dialog({child=false}:{child?:boolean}) {
    const panel=useRef<HTMLElement>(null);
    useDialogFocus(panel,()=>{if(child)childClosed++;else parentClosed++;});
    return createElement('section',{ref:panel,role:'dialog'},createElement('button',{'data-dialog-close':true},child?'Camera':'Product'));
  }
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  try {
    await act(()=>root.render(createElement('div',null,createElement(Dialog,{key:'parent'}))));
    const parentButton=host.querySelector('button')!;
    await act(()=>root.render(createElement('div',null,createElement(Dialog,{key:'parent'}),createElement(Dialog,{key:'child',child:true}))));
    await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(parentClosed,0);assert.equal(childClosed,1);
    const nextParentButton=host.querySelector('button')!;
    await act(()=>root.render(createElement('div',null,createElement(Dialog,{key:'parent'}))));
    assert.equal(document.activeElement,nextParentButton);
    await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(parentClosed,1);assert.equal(childClosed,1);
    assert.equal(nextParentButton,parentButton);
  } finally {await act(()=>root.unmount());host.remove();}
});

test('mobile quantity selection waits for an explicit field tap and keeps the field focused on rerenders', async () => {
  const original=Object.getOwnPropertyDescriptor(window.navigator,'userAgent');
  Object.defineProperty(window.navigator,'userAgent',{configurable:true,value:'iPhone'});
  const {DispatchQuantityModal}=await import('../../src/components/dispatch/DispatchQuantityModal');
  const {mapElemento}=await import('../../src/data/mappers');
  const trigger=document.body.appendChild(document.createElement('button'));trigger.focus();
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  let closed=0;
  const item=mapElemento({id:'CAB-1',codigo:'CAB001',nombre:'Cable',cantidad:10});
  try {
    await act(()=>root.render(createElement(DispatchQuantityModal,{item,inCart:0,onConfirm:()=>{},onClose:()=>{}})));
    assert.ok(document.activeElement?.hasAttribute('data-dialog-close'));
    const input=document.querySelector<HTMLInputElement>('#dispatch-add-quantity')!; input.focus();
    await act(()=>root.render(createElement(DispatchQuantityModal,{item:{...item,cantidad:12},inCart:0,onConfirm:()=>{},onClose:()=>{closed++;}})));
    assert.equal(document.activeElement,input);
    await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(closed,1);
    await act(()=>root.unmount());assert.equal(document.activeElement,trigger);
  } finally {host.remove();trigger.remove();if(original) Object.defineProperty(window.navigator,'userAgent',original);else Reflect.deleteProperty(window.navigator,'userAgent');}
});

test('the software keyboard hides quick actions while typing; browser chrome and pinch zoom do not count as a keyboard', async () => {
  assert.equal(keyboardIsVisible(true,800,400),true);
  assert.equal(keyboardIsVisible(false,800,400),false);
  assert.equal(keyboardIsVisible(true,800,720),false);
  assert.equal(keyboardIsVisible(true,800,400,2),false);
  const agent=Object.getOwnPropertyDescriptor(window.navigator,'userAgent');
  Object.defineProperty(window.navigator,'userAgent',{configurable:true,value:'Android'});
  Object.defineProperty(window,'innerHeight',{configurable:true,value:800});
  const viewport=new dom.window.EventTarget();
  let height=800, offsetTop=0;
  Object.defineProperties(viewport,{height:{get:()=>height},offsetTop:{get:()=>offsetTop},scale:{value:1}});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
  let next=0; const frames=new Map<number,FrameRequestCallback>();
  Object.assign(globalThis,{requestAnimationFrame:(callback:FrameRequestCallback)=>{frames.set(++next,callback);return next;},cancelAnimationFrame:(id:number)=>frames.delete(id)});
  const flush=async()=>{await act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(0));});};
  function Screen(){const keyboardOpen=useMobileKeyboard();return createElement('div',null,createElement('input'),createElement(MobileBottomNav,{items:quickNavigationItems('admin'),activeView:'explorer',onNavigate:()=>{},keyboardOpen}));}
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  try {
    await act(()=>root.render(createElement(Screen)));await flush();
    assert.equal(host.querySelector('nav')!.getAttribute('aria-hidden'),'false');
    host.querySelector('input')!.focus(); height=420; viewport.dispatchEvent(new dom.window.Event('resize'));await flush();
    assert.equal(host.querySelector('nav')!.getAttribute('aria-hidden'),'true');assert.ok(host.querySelector('nav')!.hasAttribute('inert'));
    assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-height'),'420px');
    // Android can pan the visible area separately from resizing it to open the keyboard.
    offsetTop=180;viewport.dispatchEvent(new dom.window.Event('scroll'));await flush();
    assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-top'),'180px');
    assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-height'),'420px');
    assert.equal(document.activeElement,host.querySelector('input'));
    host.querySelector('input')!.blur();height=800;offsetTop=0;viewport.dispatchEvent(new dom.window.Event('resize'));await flush();
    assert.equal(host.querySelector('nav')!.getAttribute('aria-hidden'),'false');
    assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-top'),'0px');
    await act(()=>root.unmount());assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-height'),'');
    assert.equal(document.documentElement.style.getPropertyValue('--app-viewport-top'),'');
  } finally {host.remove();if(agent)Object.defineProperty(window.navigator,'userAgent',agent);else Reflect.deleteProperty(window.navigator,'userAgent');Reflect.deleteProperty(window,'visualViewport');}
});
