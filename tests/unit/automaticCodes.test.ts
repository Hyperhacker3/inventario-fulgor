import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { AutomaticCodeRequests } from '../../src/data/automaticCodes';
import { WarehouseFormContent } from '../../src/components/warehouses/WarehouseFormModal';
import type { Almacen, Estanteria, NivelEstanteria, Caja } from '../../src/types';

test('automatic creation keeps a failed request ID, shares pending retries and starts a new ID only after confirmation or changed data',async()=>{
 let serial=0,calls=0,fail=true,finish!:(value:{codigo:string})=>void;
 const requests=new AutomaticCodeRequests(()=>String(++serial)),ids:string[]=[];
 const save=async(id:string)=>{ids.push(id);calls++;if(fail)throw new Error('Respuesta perdida');return {codigo:'EST001'};};
 await assert.rejects(requests.run('estanteria',{nombre:'Zona'},save),/Respuesta perdida/);
 fail=false;assert.deepEqual(await requests.run('estanteria',{nombre:'Zona'},save),{codigo:'EST001'});assert.deepEqual(ids,['1','1']);
 await requests.run('estanteria',{nombre:'Zona'},save);assert.deepEqual(ids,['1','1','2']);
 const pending=requests.run('caja',{nivel:'N1'},async id=>{ids.push(id);calls++;return new Promise<{codigo:string}>(resolve=>{finish=resolve;});});
 const retry=requests.run('caja',{nivel:'N1'},save);finish({codigo:'CAJ001'});
 assert.deepEqual(await pending,await retry);assert.equal(calls,4);
 await requests.run('caja',{nivel:'N2'},save);assert.equal(new Set(ids).size,4);
});

const dom=new JSDOM('<html><body></body></html>',{url:'https://app.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
const warehouse:Almacen={id:'W',codigo:'ALM-ANTERIOR',nombre:'Bodega',ciudad:'Honda',capacidadPorcentaje:0,estado:'Operativo'};
const rack:Estanteria={id:'R',codigo:'EST-ANTERIOR',nombre:'Estante',almacenId:'W'};
const level:NivelEstanteria={id:'N',codigo:'NIV-ANTERIOR',nombre:'Piso',estanteriaId:'R'};
const box:Caja={id:'B',codigoCaja:'CAJ-ANTERIOR',estanteriaId:'R',nivelId:'N',estado:'Parcial'};
const change=(input:HTMLInputElement,value:string)=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};

test('every location form shows an automatic code when creating, a read-only code when editing, and never submits manual code changes',async()=>{
 const calls:{kind:string;id?:string;input:Record<string,unknown>}[]=[],created:string[]=[];
 const inventory={almacenes:[warehouse],estanterias:[rack],niveles:[level],cajas:[box],
  addAlmacen:async(input:Omit<Almacen,'id'>)=>{calls.push({kind:'almacen',input});return {...input,id:'NEW-W',codigo:'ALM002'};},
  addEstanteria:async(input:Omit<Estanteria,'id'>)=>{calls.push({kind:'estanteria',input});return {...input,id:'NEW-R',codigo:'EST002'};},
  addNivel:async(input:Omit<NivelEstanteria,'id'>)=>{calls.push({kind:'nivel',input});return {...input,id:'NEW-N',codigo:'NIV002'};},
  addCaja:async(input:Omit<Caja,'id'>)=>{calls.push({kind:'caja',input});return {...input,id:'NEW-B',codigoCaja:'CAJ002'};},
  updateAlmacen:async(id:string,input:Partial<Almacen>)=>{calls.push({kind:'almacen',id,input});},
  updateEstanteria:async(id:string,input:Partial<Estanteria>)=>{calls.push({kind:'estanteria',id,input});},
  updateNivel:async(id:string,input:Partial<NivelEstanteria>)=>{calls.push({kind:'nivel',id,input});},
  updateCaja:async(id:string,input:Partial<Caja>)=>{calls.push({kind:'caja',id,input});},
 };
 for(const [kind,id,parentId,prefix] of [['almacen','W','','ALM'],['estanteria','R','W','EST'],['nivel','N','R','NIV'],['caja','B','N','CAJ']] as const){
  for(const mode of ['new','edit'] as const){
   const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
   try{
    await act(()=>root.render(h(WarehouseFormContent,{target:{kind,mode,id:mode==='edit'?id:undefined,parentId},onClose:()=>{},onCreatedWarehouse:id=>created.push(id),inventory})));
    const inputs=document.querySelectorAll<HTMLInputElement>('[role="dialog"] input');
    const code=inputs[0];assert.equal(code.readOnly,true);assert.match(code.value,new RegExp(prefix));
    if(mode==='new')assert.match(code.value,/Se asigna/);
    if(kind!=='caja')await act(()=>change(inputs[1],'Nombre nuevo'));
    await act(async()=>document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    const last=calls.at(-1)!;assert.equal(last.kind,kind);
    if(mode==='edit'){assert.equal(last.id,id);assert.equal(last.input.codigo,undefined);assert.equal(last.input.codigoCaja,undefined);}
    else assert.equal(kind==='caja'?last.input.codigoCaja:last.input.codigo,'');
   }finally{await act(()=>root.unmount());host.remove();}
  }
 }
 assert.deepEqual(created,['NEW-W']);
});
