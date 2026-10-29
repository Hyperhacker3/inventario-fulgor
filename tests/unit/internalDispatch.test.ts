import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InternalRequests, loadInternalJobs } from '../../src/domain/internalRequests';
import { returnAmounts, validateInternalAmounts, type InternalDispatch, type InternalIssueInput } from '../../src/domain/internalDispatch';
import { available } from '../../src/domain/inventory';
import { mapElemento } from '../../src/data/mappers';
import { inventoryValues } from '../../src/domain/money';
import { DEFAULT_COMPANY } from '../../src/domain/company';
import { InternalIssueContent } from '../../src/components/internal/InternalIssueForm';
import { InternalReturnForm } from '../../src/components/internal/InternalReturnDialog';
import { StaffForm } from '../../src/components/internal/StaffManager';
import { InternalPrintHeader, InternalPrintTable, internalClosing } from '../../src/components/internal/InternalPrintSections';

const item=mapElemento({id:'p',codigo:'MAT001',nombre:'Herramienta',cantidad:10,unidad:'UND',cantidad_danados:1,cantidad_prestada:2.5,especificaciones:{valor_unitario_cop:100}});
const loan:InternalDispatch={id:'loan',codigo:'INT-20261029-001',created_at:'2026-10-29T15:00:00Z',entregado_por:'Persona sesión',cargo_entregado:'Almacenista',personal_id:'staff',recibido_por:'Persona recibe',cargo_recibido:'Técnico',empresa:DEFAULT_COMPANY,estado:'PARCIAL',items:[{elementoId:'p',codigo:'MAT001',nombre:'Herramienta original',marca:'Marca',cantidad:2.5,devuelta:1,pendiente:1.5,unidad:'UND',ubicacion:'Almacén > Caja'}],devoluciones:[]};

test('loans reduce availability without reducing total stock or inventory valuation; return amounts respect each unit and outstanding balance',()=>{
 assert.equal(available(item),6.5);assert.equal(item.cantidad,10);assert.equal(inventoryValues([item]).total,1000);
 assert.deepEqual(returnAmounts(loan,{p:1.125}),[{elementoId:'p',cantidad:1.125}]);
 for(const amount of [-1,2,0.0001,Infinity])assert.throws(()=>returnAmounts(loan,{p:amount}));
 assert.throws(()=>returnAmounts(loan,{}));assert.throws(()=>validateInternalAmounts([{elementoId:'p',cantidad:1},{elementoId:'p',cantidad:1}]));
});

test('lost internal responses freeze the original payload, persist the request across reloads and only release it after confirmation or a proven rejection',async()=>{
 const snapshots:Record<string,import('../../src/domain/internalRequests').InternalJob>[]=[];
 const requests=new InternalRequests({},jobs=>snapshots.push(structuredClone(jobs)),()=> '29600000-0000-0000-0000-000000000001');
 const payload={personalId:'staff',items:[{elementoId:'p',cantidad:1}]};
 await assert.rejects(requests.run('issue',payload,async()=>{throw new Error('Respuesta perdida');}));
 assert.ok(requests.jobs.issue);await assert.rejects(requests.run('issue',{...payload,personalId:'another'},async()=>0),/solicitud por confirmar/);
 const resumed=new InternalRequests(structuredClone(requests.jobs));let id='';
 const result=await resumed.run('issue',payload,async request=>{id=request;return loan;});assert.equal(result,loan);assert.equal(id,requests.jobs.issue.id);assert.deepEqual(resumed.jobs,{});
 await assert.rejects(resumed.run('return:loan',{items:[]},async()=>{throw Object.assign(new Error('Rechazo SQL'),{code:'P0001'});}));assert.deepEqual(resumed.jobs,{});
 await assert.rejects(resumed.run('issue',payload,async()=>{throw Object.assign(new Error('Respuesta incierta'),{code:'PGRST999'});}));assert.ok(resumed.jobs.issue);
 await assert.rejects(resumed.run('issue',payload,async()=>{throw Object.assign(new Error('RPC no disponible'),{code:'PGRST202'});}));assert.deepEqual(resumed.jobs,{});
 assert.equal(snapshots.length,1);
});

test('concurrent clicks share a single internal request and no new UUID is assigned while confirmation is pending',async()=>{
 let calls=0,complete!:(value:number)=>void;const requests=new InternalRequests();
 const save=async()=>{calls++;return new Promise<number>(resolve=>{complete=resolve;});};
 const first=requests.run('issue',{items:[]},save),second=requests.run('issue',{items:[]},save);
 await Promise.resolve();assert.equal(calls,1);complete(12);assert.deepEqual(await Promise.all([first,second]),[12,12]);assert.deepEqual(requests.jobs,{});
});

const dom=new JSDOM('<html><body></body></html>',{url:'https://app.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
const type=(input:HTMLInputElement,value:string)=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};

test('request recovery is scoped to saved account jobs and rejects malformed local records',()=>{
 localStorage.setItem('test','{"issue":{"id":"29600000-0000-0000-0000-000000000001","payload":{"personalId":"staff","items":[{"elementoId":"p","cantidad":1}]}},"other":{"id":"x"}}');assert.deepEqual(Object.keys(loadInternalJobs('test')),['issue']);
 localStorage.setItem('test','broken');assert.deepEqual(loadInternalJobs('test'),{});
});

test('internal form uses session identity, staff selection and the shared chosen products without project, transport or automatic PDF fields',async()=>{
 const host=document.body.appendChild(document.createElement('div')),root=createRoot(host),sent:InternalIssueInput[]=[];
 const inventory={user:{name:'Persona sesión',cargo:'Almacenista',role:'admin',email:'test',avatar:''},internalJobs:{},internalRecipient:'staff',setInternalRecipient:()=>{},elementos:[item],dispatchCart:[{elemento:item,cantidad:1.25}],
  issueInternal:async(input:InternalIssueInput)=>{sent.push(input);if(sent.length===1)throw new Error('Sin conexión');return loan;},clearDispatchCart(){},openItemDetail(){},updateDispatchCartQuantity(){},removeFromDispatchCart(){}};
 try{
  await act(()=>root.render(h(InternalIssueContent,{inventory,staff:{data:[{id:'staff',nombre:'Persona recibe',cargo:'Técnico',activo:true,version:1}],isError:false,error:null,refetch(){}},search:h('p',{},'Buscador compartido')})));
  assert.match(host.textContent!,/Persona sesión/);assert.match(host.textContent!,/Almacenista/);assert.match(host.textContent!,/Técnico/);assert.match(host.textContent!,/Herramienta/);
  assert.equal(host.querySelectorAll('select').length,1);assert.equal(host.querySelector('textarea'),null);assert.equal(host.querySelector('[role="dialog"]'),null);
  const submit=()=>host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await act(async()=>submit());assert.match(host.querySelector('[role="alert"]')!.textContent!,/Sin conexión/);assert.equal(host.querySelector<HTMLInputElement>('input[type="number"]')!.value,'1.25');
  await act(async()=>submit());assert.deepEqual(sent[1],{personalId:'staff',items:[{elementoId:'p',cantidad:1.25}]});assert.match(host.querySelector('[role="status"]')!.textContent!,/confirmada/);assert.equal(host.querySelector('[role="dialog"]'),null);
 }finally{await act(()=>root.unmount());host.remove();}
});

test('return form keeps quantities on failure, prevents double submissions, supports partial returns and closes only after confirmation',async()=>{
 const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);let calls=0,closed=0;const received:unknown[]=[];
 try{
  await act(()=>root.render(h(InternalReturnForm,{loan,onClose:()=>closed++,save:async input=>{calls++;received.push(input);if(calls===1)throw new Error('Sin conexión');return loan;}})));
  const input=document.querySelector<HTMLInputElement>('[aria-label="Devolver MAT001"]')!;await act(()=>type(input,'0.5'));
  const submit=()=>document.querySelector('[role="dialog"] form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await act(async()=>{submit();submit();});assert.equal(calls,1);assert.equal(closed,0);assert.equal(input.value,'0.5');
  await act(async()=>submit());assert.equal(closed,1);assert.deepEqual(received[1],{salidaId:'loan',items:[{elementoId:'p',cantidad:0.5}]});
 }finally{await act(()=>root.unmount());host.remove();}
});

test('personnel editor preserves name, role and active status across failed saves and retries',async()=>{
 const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);let calls=0,closed=0;
 try{
  await act(()=>root.render(h(StaffForm,{initial:{id:null,nombre:'',cargo:'',activo:true,version:0},frozen:false,onClose:()=>closed++,save:async input=>{calls++;if(calls===1)throw new Error('Sin conexión');return {...input,id:'staff'};}})));
  const inputs=[...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input')];await act(()=>{type(inputs[0],'Trabajador');type(inputs[1],'Técnico');});
  const submit=()=>document.querySelector('[role="dialog"] form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await act(async()=>submit());assert.equal(inputs[0].value,'Trabajador');assert.equal(inputs[1].value,'Técnico');assert.equal(closed,0);
  await act(async()=>submit());assert.equal(calls,2);assert.equal(closed,1);
 }finally{await act(()=>root.unmount());host.remove();}
});

test('internal PDF content uses its saved names, company, delivered/returned/pending amounts and return events',()=>{
 const saved=structuredClone(loan);saved.devoluciones=[{id:'event',created_at:loan.created_at,registrado_por:'Responsable original',cargo:'Almacenista',items:[{...loan.items[0],cantidad:1}]}];
 const html=renderToStaticMarkup(h('div',{},h(InternalPrintHeader,{loan:saved}),h(InternalPrintTable,{loan:saved,indices:[0]}),...internalClosing(saved)));
 assert.match(html,/SALIDA INTERNA/);assert.match(html,/Persona sesión/);assert.match(html,/Persona recibe/);assert.match(html,/Herramienta original/);assert.match(html,/DEVUELTO/);assert.match(html,/PENDIENTE/);assert.match(html,/Responsable original/);
 assert.doesNotMatch(html,/PROYECTO|TRANSPORTADOR|FORMATO DE REMISIÓN/);
});
