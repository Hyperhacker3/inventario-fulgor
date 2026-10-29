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
const warehouse:Almacen={id:'W',codigo:'ALM-ANTERIOR',nombre:'Bodega',ciudad:'Honda',descripcion:'Descripción anterior',capacidadPorcentaje:0,estado:'Operativo'};
const rack:Estanteria={id:'R',codigo:'EST-ANTERIOR',nombre:'Estante',almacenId:'W',descripcion:'Descripción anterior'};
const level:NivelEstanteria={id:'N',codigo:'NIV-ANTERIOR',nombre:'Piso',estanteriaId:'R',descripcion:'Descripción anterior'};
const box:Caja={id:'B',codigoCaja:'CAJ-ANTERIOR',estanteriaId:'R',nivelId:'N',estado:'Completa',descripcion:'Descripción anterior'};
const change=(input:HTMLInputElement,value:string)=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};

test('location creation asks only for the requested fields, keeps automatic defaults and preserves metadata and read-only codes when editing',async()=>{
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
    const labels=[...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')];
    const labelNames=labels.map(label=>label.firstChild?.textContent);
    const field=(name:string)=>labels.find(label=>label.firstChild?.textContent===name)?.querySelector('input');
    if(mode==='new'){
     assert.deepEqual(labelNames,kind==='almacen'?['Nombre','Ciudad']:kind==='caja'?['Nivel de estantería']:['Nombre']);
    }else{
     const code=field('Código')!;assert.equal(code.readOnly,true);assert.match(code.value,new RegExp(prefix));
     assert.equal(field('Descripción')!.value,'Descripción anterior');
     assert.equal(labelNames.includes('Estado'),kind==='caja'||kind==='almacen');
    }
    if(kind!=='caja')await act(()=>change(field('Nombre')!,'Nombre nuevo'));
    if(kind==='almacen')await act(()=>change(field('Ciudad')!,'Bogotá'));
    await act(async()=>document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    const last=calls.at(-1)!;assert.equal(last.kind,kind);
    if(mode==='edit'){
     assert.equal(last.id,id);assert.equal(last.input.codigo,undefined);assert.equal(last.input.codigoCaja,undefined);
     assert.equal(last.input.descripcion,'Descripción anterior');
     if(kind==='caja')assert.equal(last.input.estado,'Completa');
    }else{
     assert.equal(kind==='caja'?last.input.codigoCaja:last.input.codigo,'');
     assert.equal(last.input.descripcion,'');
     if(kind==='caja'){assert.equal(last.input.estado,'Parcial');assert.equal(last.input.nivelId,'N');assert.equal(last.input.estanteriaId,'R');}
    }
    if(kind!=='caja')assert.equal(last.input.nombre,'Nombre nuevo');
    if(kind==='almacen')assert.equal(last.input.ciudad,'Bogotá');
   }finally{await act(()=>root.unmount());host.remove();}
  }
 }
 assert.deepEqual(created,['NEW-W']);
});
