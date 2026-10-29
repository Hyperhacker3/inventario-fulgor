import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { mapAlmacen, mapCaja, mapElemento, mapEstanteria, mapNivel } from '../../src/data/mappers';
import { boxLabel, locationBreadcrumbs } from '../../src/domain/locationNavigation';
import { ALL_LOCATIONS, emptyInventoryFilters, filterInventory, type InventoryFilters } from '../../src/domain/explorer';
import { ItemLocationLinks } from '../../src/components/item/ItemLocationLinks';
import { useInventoryExplorer } from '../../src/state/useInventoryExplorer';
import { useViewNavigation } from '../../src/state/useViewNavigation';
import { ensureBoxNamesReady } from '../../src/data/boxNames';

const warehouses = ['w1','w2'].map(id => mapAlmacen({ id, nombre: id }));
const racks = ['r1','r2'].map((id, i) => mapEstanteria({ id, almacen_id: warehouses[i].id, nombre: 'Sin estantería' }));
const levels = ['n1','n2'].map((id, i) => mapNivel({ id, estanteria_id: racks[i].id, nombre: 'En el piso' }));
const boxes = ['b1','b2'].map((id, i) => mapCaja({ id, codigo: 'CAJ007', nombre: 'Herramientas', estanteria_id: racks[i].id, nivel_id: levels[i].id }));
const item = mapElemento({ id:'item', nombre:'Taladro', almacen_id:'w1', estanteria_id:'r1', nivel_id:'n1', caja_id:'b1' });
const products = [item, { ...item, id:'other-box', cajaId:null }, { ...item, id:'other-level', nivelId:null, cajaId:null },
  { ...item, id:'other-rack', estanteriaId:null, nivelId:null, cajaId:null },
  { ...item, id:'other-warehouse', almacenId:'w2', estanteriaId:'r2', nivelId:'n2', cajaId:'b2' }];

test('each location filters its whole subtree by IDs and never mixes identical names or box codes in different parents', () => {
  const crumbs = locationBreadcrumbs(item, warehouses, racks, levels, boxes);
  assert.deepEqual(crumbs.map(row => row.label), ['w1','Sin estantería','Nivel En el piso','CAJ007 · Herramientas']);
  const expected = [['item','other-box','other-level','other-rack'], ['item','other-box','other-level'], ['item','other-box'], ['item']];
  for (const [index, crumb] of crumbs.entries()) {
    assert.deepEqual(filterInventory(products, crumb.filters, '', () => '').map(row => row.id), expected[index]);
    assert.deepEqual(crumb.filters.categories, []); assert.equal(crumb.filters.stock,'todos');
  }
  assert.equal(crumbs[1].filters.levelId, ALL_LOCATIONS);
  assert.deepEqual(locationBreadcrumbs({ ...item, almacenId:null, estanteriaId:null, nivelId:null, cajaId:null }, warehouses,racks,levels,boxes), []);
  assert.equal(boxLabel({ ...boxes[0], nombre:' CAJ007 ' }), 'CAJ007');
  assert.equal(boxLabel({ ...boxes[0], nombre:undefined }), 'CAJ007');
});

const dom = new JSDOM('<html><body></body></html>', { url:'https://app.test/#/entries' });
Object.assign(globalThis, { window:dom.window, document:dom.window.document, HTMLElement:dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT:true });
const { createRoot } = await import('react-dom/client');

test('location activation closes detail, navigates from another screen or the inventory itself, clears prior restrictions and retains filters across screens', async () => {
  let current!: ReturnType<typeof useInventoryExplorer>;
  let nav!: ReturnType<typeof useViewNavigation>;
  let global = 'previous search', closed = 0;
  function Harness() {
    nav = useViewNavigation();
    current = useInventoryExplorer(nav.setActiveView, () => closed++, value => { global = value; });
    const [disabled,setDisabled] = useState(false);
    return h('div', {}, h('button', { onClick:()=>setDisabled(value=>!value), id:'toggle' }, 'Busy'),
      h(ItemLocationLinks, { item, warehouses,racks,levels,boxes,disabled,onNavigate:current.openLocationInventory }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(()=>root.render(h(Harness)));
    await act(()=>current.setExplorerState({ search:'hidden',page:4,filtersOpen:false,
      filters:{ ...emptyInventoryFilters(),stock:'agotado',categories:['OTROS'],condition:'MALO' } }));
    const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('.item-location-link')];
    assert.equal(buttons().length,4); buttons()[3].focus(); assert.equal(document.activeElement,buttons()[3]);
    await act(()=>buttons()[3].click());
    assert.equal(window.location.hash,'#/explorer'); assert.equal(nav.activeView,'explorer'); assert.equal(global,''); assert.equal(closed,1);
    assert.equal(current.explorerState.search,''); assert.equal(current.explorerState.page,1); assert.equal(current.explorerState.filtersOpen,true);
    assert.deepEqual(current.explorerState.filters,locationBreadcrumbs(item,warehouses,racks,levels,boxes)[3].filters);
    await act(()=>nav.setActiveView('entries')); await act(()=>nav.setActiveView('explorer'));
    assert.equal(current.explorerState.filters.boxId,'b1');
    await act(()=>buttons()[1].click());
    assert.equal(current.explorerState.filters.rackId,'r1'); assert.equal(current.explorerState.filters.boxId,ALL_LOCATIONS);
    const range = document.createRange(); range.selectNodeContents(buttons()[0]); window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
    assert.equal(window.getSelection()!.toString(),'w1');
    await act(()=>buttons()[0].click()); assert.equal(closed,2); window.getSelection()!.removeAllRanges();
    await act(()=>host.querySelector<HTMLButtonElement>('#toggle')!.click());
    await act(()=>buttons()[0].click()); assert.equal(closed,2);
  } finally { await act(()=>root.unmount()); host.remove(); }
});

test('box names require activation and preserve actionable migration or connection errors for a retry', async () => {
  await ensureBoxNamesReady(async()=>true);
  await assert.rejects(ensureBoxNamesReady(async()=>false),/20261029000400_box_names.sql/);
  await assert.rejects(ensureBoxNamesReady(async()=>{throw Object.assign(new Error('Missing RPC'),{code:'PGRST202'});}),/20261029000400_box_names.sql/);
  await assert.rejects(ensureBoxNamesReady(async()=>{throw new Error('Sin conexión');}),/Sin conexión/);
});
