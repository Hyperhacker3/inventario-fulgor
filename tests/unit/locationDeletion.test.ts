import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { LocationsManagerContent } from '../../src/components/administration/LocationsManager';
import { CLOSE_DURATION } from '../../src/components/ui/Motion';
import { mapAlmacen, mapEstanteria, mapNivel, mapCaja } from '../../src/data/mappers';
import type { LocationKind, UserProfile } from '../../src/types';

const dom=new JSDOM('<html><body></body></html>',{url:'https://app.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
const almacenes=[mapAlmacen({id:'W',codigo:'ALM001',nombre:'Bodega'})];
const estanterias=[mapEstanteria({id:'R',codigo:'EST001',nombre:'Estante',almacen_id:'W'})];
const niveles=[mapNivel({id:'N',codigo:'NIV001',nombre:'Superior',estanteria_id:'R'})];
const cajas=[mapCaja({id:'B',codigo:'CAJ001',estanteria_id:'R',nivel_id:'N',estado:'PARCIAL'})];
const user:UserProfile={name:'Admin',email:'admin@test.local',avatar:'',role:'admin'};
const button=(scope:ParentNode,label:string)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(value=>value.textContent===label)!;
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,CLOSE_DURATION+25));});

test('location deletion identifies each entity, preserves failures, blocks duplicate saves and closing while pending, and stays hidden for read roles',async()=>{
 for(const [kind,id] of [['almacen','W'],['estanteria','R'],['nivel','N'],['caja','B']] as const){
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const calls:{kind:LocationKind;id:string}[]=[];let fail=true,finish!:()=>void;
  const props={kind,almacenes,estanterias,niveles,cajas,elementos:[],user,
   getAlmacenById:(id:string|null)=>almacenes.find(row=>row.id===id),getEstanteriaById:(id:string|null)=>estanterias.find(row=>row.id===id),
   deleteLocation:async(kind:LocationKind,id:string)=>{calls.push({kind,id});if(fail)throw new Error('Tiene productos asignados');await new Promise<void>(resolve=>{finish=resolve;});}};
  try{
   await act(()=>root.render(h(LocationsManagerContent,props)));
   assert.doesNotMatch(host.textContent!,/Parcial|Completa|Vacia/);
   const remove=host.querySelector<HTMLButtonElement>('button[aria-label^="Eliminar "]')!;
   assert.ok(remove);await act(()=>{remove.focus();remove.click();});
   assert.equal(calls.length,0);assert.ok(document.activeElement===button(document,'Cancelar'),'focus starts on Cancelar');
   const message=document.querySelector('[role="dialog"]')!.textContent!;
   assert.match(message,new RegExp({almacen:'ALM001',estanteria:'EST001',nivel:'NIV001',caja:'CAJ001'}[kind]));
   if(kind==='caja')assert.match(message,/Estante.*Superior/);
   await act(()=>button(document,'Cancelar').click());await settle();
   assert.equal(document.querySelector('[role="dialog"]'),null);assert.ok(document.activeElement===remove,'focus returns to the delete button');
   await act(()=>remove.click());await act(async()=>button(document,'Confirmar eliminación').click());
   assert.match(document.querySelector('[role="alert"]')!.textContent!,/productos asignados/);
   assert.deepEqual(calls,[{kind,id}]);fail=false;
   const confirmation=button(document,'Confirmar eliminación');
   await act(()=>{confirmation.click();confirmation.click();});assert.equal(calls.length,2);
   assert.equal(button(document,'Cancelar').disabled,true);
   await act(()=>{document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector<HTMLElement>('.ui-modal-layer')!.click();});
   assert.equal(document.querySelector('[role="dialog"]')!.getAttribute('aria-busy'),'true');
   await act(async()=>finish());await settle();assert.equal(document.querySelector('[role="dialog"]'),null);
   for(const role of ['consulta','operador'] as const){
    await act(()=>root.render(h(LocationsManagerContent,{...props,user:{...user,role}})));
    assert.equal(host.querySelector('button[aria-label^="Eliminar "]'),null);
   }
  }finally{await act(()=>root.unmount());host.remove();}
 }
});
