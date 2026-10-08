import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapAlmacen, mapEstanteria, mapNivel, mapCaja, mapElemento, mapRemision } from '../../src/data/mappers';
import { byId, locationLabel, validateItem } from '../../src/domain/inventory';
import { emptyInventoryFilters, changeWarehouse, changeRack, changeLevel, filterInventory, locationChoices, ALL_LOCATIONS, NO_LOCATION } from '../../src/domain/explorer';
import { inventoryLocationValues } from '../../src/domain/money';
import { WarehouseTreeContent } from '../../src/components/warehouses/WarehouseTree';
import { StockAlerts } from '../../src/components/StockAlerts';
import { ItemLevelSelector } from '../../src/components/item/ItemLevelSelector';
import { ItemDetailContent } from '../../src/components/ItemDetailModal';
import { ItemLocationFieldsContent } from '../../src/components/item/ItemLocationFields';

const warehouses=[mapAlmacen({id:'W1',nombre:'Norte'})];
const racks=[mapEstanteria({id:'R1',nombre:'Estante',almacen_id:'W1'}),mapEstanteria({id:'R2',nombre:'Otro',almacen_id:'W1'})];
const levels=[mapNivel({id:'L1',estanteria_id:'R1',codigo:'N1',nombre:'Superior'}),mapNivel({id:'L2',estanteria_id:'R1',codigo:'N2',nombre:'Inferior'}),mapNivel({id:'L3',estanteria_id:'R2',codigo:'N1',nombre:'Superior'})];
const boxes=[mapCaja({id:'B1',estanteria_id:'R1',nivel_id:'L1',codigo:'Caja 1'}),mapCaja({id:'B2',estanteria_id:'R1',nivel_id:'L2',codigo:'Caja 2'})];
const product=mapElemento({id:'M1',codigo:'MAT001',nombre:'Material',almacen_id:'W1',estanteria_id:'R1',nivel_id:'L1',caja_id:'B1',cantidad:10,cantidad_danados:2,stock_minimo:15,especificaciones:{marca:'Fabricante',valor_unitario_cop:100}});

test('levels complete the location, constrain parent choices and count each material once at all four levels',()=>{
  assert.equal(locationLabel(product,byId(warehouses),byId(racks),byId(boxes),byId(levels)),'Norte > Estante > Nivel Superior > Caja 1');
  assert.doesNotThrow(()=>validateItem(product,warehouses,racks,boxes,levels));
  assert.throws(()=>validateItem({...product,nivelId:'L3'},warehouses,racks,boxes,levels),/nivel no pertenece/);
  assert.throws(()=>validateItem({...product,nivelId:'L2'},warehouses,racks,boxes,levels),/caja no pertenece/);
  const choices=locationChoices(racks,boxes,'W1','R1',levels,'L1');
  assert.deepEqual(choices.levels.map(row=>row.id),['L1','L2']);assert.deepEqual(choices.boxes.map(row=>row.id),['B1']);
  const items=[product,{...product,id:'M2',nivelId:'L2',cajaId:null,cantidad:3,cantidadDanados:1},{...product,id:'M3',nivelId:null,cajaId:null,cantidad:2,cantidadDanados:0}];
  const filters={...emptyInventoryFilters(),warehouseId:'W1',rackId:'R1',levelId:'L1',boxId:'B1'};
  assert.deepEqual(filterInventory(items,filters,'fabricante',()=>''),[product]);
  assert.deepEqual(filterInventory(items,{...emptyInventoryFilters(),levelId:NO_LOCATION},'',()=>''),[items[2]]);
  assert.equal(changeWarehouse(filters,'W2').levelId,ALL_LOCATIONS);assert.equal(changeRack(filters,'R2').levelId,ALL_LOCATIONS);
  assert.equal(changeLevel(filters,'L2').boxId,ALL_LOCATIONS);
  const values=inventoryLocationValues(items);
  assert.deepEqual(values.levels.get('L1'),{total:1000,damaged:200});assert.deepEqual(values.levels.get('L2'),{total:300,damaged:100});
  assert.deepEqual(values.racks.get('R1'),{total:1500,damaged:300});
});

test('warehouse layout groups boxes inside their levels and keeps legacy unassigned boxes visible',()=>{
  const legacy=mapCaja({id:'OLD',estanteria_id:'R1',codigo:'Anterior'});
  const markup=renderToStaticMarkup(h(WarehouseTreeContent,{almacen:warehouses[0],estanterias:racks,niveles:levels,cajas:[...boxes,legacy],elementos:[product],canAdmin:false,
    onEditWarehouse(){},onNewRack(){},onEditRack(){},onNewLevel(){},onEditLevel(){},onNewBox(){},onEditBox(){},openItemDetail(){}}));
  const body=new JSDOM(markup).window.document.body;
  assert.match(body.querySelector('[data-level="L1"]')!.textContent!,/Caja 1/);
  assert.doesNotMatch(body.querySelector('[data-level="L2"]')!.textContent!,/Caja 1/);
  assert.match(body.textContent!,/Sin nivel asignado/);assert.match(body.textContent!,/Anterior/);
});

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://app.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
async function choose(host:HTMLElement,value:string){
  await act(()=>host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
  await act(()=>document.querySelector<HTMLButtonElement>(`[role="option"][data-value="${value}"]`)!.click());
}
const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
const type=(input:HTMLInputElement,value:string)=>{setter.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};

test('location hierarchy never duplicates level/box controls when empty parents change, and clears dependent drafts', async () => {
  function Location() {
    const [warehouseId,onWarehouse]=useState('W1'),[rackId,onRack]=useState(''),[levelId,onLevel]=useState(''),[boxId,onBox]=useState('');
    return h(ItemLocationFieldsContent,{warehouseId,rackId,levelId,boxId,onWarehouse,onRack,onLevel,onBox,
      inventory:{almacenes:warehouses,estanterias:racks,niveles:levels,cajas:boxes,
        addCaja:async()=>{throw new Error('Unexpected create');},addNivel:async()=>{throw new Error('Unexpected create');},addEstanteria:async()=>{throw new Error('Unexpected create');}}});
  }
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const errors:string[]=[];const previousError=console.error;console.error=(...values)=>{errors.push(values.join(' '));};
  const change=async(id:string,value:string)=>act(()=>{const select=host.querySelector<HTMLSelectElement>(`#${id}-value`)!;select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  const single=()=>{for(const id of ['select-almacen-form','select-estanteria-form','select-nivel-form','select-caja-form'])assert.equal(host.querySelectorAll(`#${id}`).length,1,id);};
  try {
    await act(()=>root.render(h(Location)));single();
    for(const rack of ['R1','R2','','R1']) {
      await change('select-estanteria-form',rack);single();
      const level=host.querySelector<HTMLSelectElement>('#select-nivel-form-value')!;
      assert.equal(level.value,'');assert.equal(host.querySelector<HTMLButtonElement>('#select-nivel-form')!.disabled,!rack);
    }
    await change('select-nivel-form','L1');await change('select-caja-form','__NEW_BOX__');
    assert.ok(host.querySelector('#input-nueva-caja'));
    await change('select-nivel-form','L2');single();assert.equal(host.querySelector('#input-nueva-caja'),null);
    assert.equal(host.querySelector<HTMLSelectElement>('#select-caja-form-value')!.value,'');
    await change('select-estanteria-form','');single();
    assert.equal(errors.filter(error=>/same key|unique.*key/i.test(error)).length,0);
  } finally {console.error=previousError;await act(()=>root.unmount());host.remove();}
});

test('the remaining-alerts link reveals every item and the last item opens its own detail',async()=>{
  const alerts=Array.from({length:160},(_,index)=>({...product,id:`M${index}`,codigo:`MAT${index}`}));
  let selected='';const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  try {
    await act(()=>root.render(h(StockAlerts,{alerts,onItem:item=>{selected=item.id;}})));
    assert.equal(host.querySelectorAll('button').length,11);
    const more=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('150 elementos más'))!;
    await act(()=>more.click());assert.equal(host.querySelectorAll('button').length,160);
    assert.match(host.querySelector('[role="status"]')!.textContent!,/160 alertas/);
    await act(()=>host.querySelectorAll('button')[159].click());assert.equal(selected,'M159');
  }finally{await act(()=>root.unmount());host.remove();}
});

test('inline level creation requires a rack, keeps failed drafts and selects a confirmed level once',async()=>{
  let fail=true,calls=0;const selected:string[]=[],drafts:boolean[]=[];
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const props={rackId:'',levelId:'',levels:[],onLevel:(id:string)=>selected.push(id),onDraftChange:(value:boolean)=>drafts.push(value),
    onCreate:async(input:Omit<import('../../src/types').NivelEstanteria,'id'>)=>{calls++;assert.equal(input.estanteriaId,'R1');assert.equal(input.codigo,'N4');if(fail)throw new Error('Sin conexión');return {...input,id:'L4'};}};
  try {
    await act(()=>root.render(h(ItemLevelSelector,props)));assert.equal(host.querySelector('select')!.disabled,true);
    await act(()=>root.render(h(ItemLevelSelector,{...props,rackId:'R1'})));
    assert.equal(host.querySelector('select')!.options[1].value,'__NEW_LEVEL__');
    await choose(host,'__NEW_LEVEL__');
    await act(()=>{const inputs=host.querySelectorAll('input');type(inputs[0],'n4');type(inputs[1],'Centro');});
    const button=host.querySelector<HTMLButtonElement>('button:not([role="combobox"])')!;
    await act(async()=>button.click());assert.match(host.querySelector('[role="alert"]')!.textContent!,/Sin conexión/);
    assert.equal(host.querySelector('input')!.value,'n4');assert.deepEqual(selected,[]);
    fail=false;await act(async()=>{button.click();button.click();});assert.equal(calls,2);assert.deepEqual(selected,['L4']);assert.deepEqual(drafts,[true,false]);
  }finally{await act(()=>root.unmount());host.remove();}
});

test('editing includes existing levels and an editable brand; errors preserve the chosen full location and brand',async()=>{
  let saved:Partial<import('../../src/types').Elemento>|undefined;
  const inventory={user:{name:'Persona',cargo:'Almacenista',role:'admin',email:'test@app.test',avatar:''},almacenes:warehouses,estanterias:racks,niveles:levels,cajas:boxes,
    getLocationString:()=>'',openQuickMovement(){},addToDispatchCart(){},categoryLabel:(value:string)=>value,deleteElemento:async()=>{},
    updateElemento:async(_id:string,value:Partial<import('../../src/types').Elemento>)=>{saved=value;throw new Error('Sin conexión');}};
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  try {
    await act(()=>root.render(h(ItemDetailContent,{item:{...product,estado:'OBSOLETO'},onClose(){},inventory})));
    const brandData = [...host.querySelectorAll('dt')].find(field => field.textContent === 'Marca')!.nextElementSibling!;
    assert.equal(brandData.textContent, 'Fabricante');
    await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Editar"]')!.click());
    const editor=document.querySelector<HTMLElement>('[data-item-edit-dialog]')!;
    const conditionLabel=[...editor.querySelectorAll('label')].find(label=>label.textContent?.startsWith('Estado'))!;
    assert.equal(conditionLabel.querySelector('select')!.value,'MALO');
    assert.match(conditionLabel.querySelector('[role="combobox"]')!.textContent!,/MALO/);
    assert.deepEqual([...conditionLabel.querySelector('select')!.options].map(option=>option.value), ['BUENO','REGULAR','MALO','EN REPARACIÓN','RETAZOS']);
    const label=[...editor.querySelectorAll('label')].find(label=>label.textContent==='Nivel de estantería')!;
    const native=document.getElementById(`${label.htmlFor}-value`) as HTMLSelectElement;
    assert.equal(native.value,'L1');assert.deepEqual([...native.options].map(option=>option.value),['','L1','L2']);
    const brandLabel=[...editor.querySelectorAll('label')].find(label=>label.textContent==='Marca')!;
    await act(()=>type(brandLabel.querySelector('input')!,'Otra marca'));
    await act(async()=>editor.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(saved?.marca,'Otra marca');assert.equal(saved?.cantidad,undefined);assert.equal(saved?.nivelId,undefined);
    assert.equal(saved?.estado,'MALO');
    assert.match(editor.querySelector('[role="alert"]')!.textContent!,/Sin conexión/);assert.equal(native.value,'L1');assert.equal(brandLabel.querySelector('input')!.value,'Otra marca');
    const remission=mapRemision({items:[{elementoId:product.id,codigo:product.codigo,nombre:product.nombre,marca:'Anterior',cantidad:1}]},new Map([[product.codigo,product]]));
    assert.equal(remission.items[0].marca,'Anterior');
  }finally{await act(()=>root.unmount());host.remove();}
});
