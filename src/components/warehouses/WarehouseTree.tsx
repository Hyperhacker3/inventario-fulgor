import { useMemo } from 'react';
import type { Almacen, Estanteria, NivelEstanteria, Caja, Elemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { inventoryLocationValues } from '../../domain/money';
import { LocationValueSummary, locationValueHint } from './LocationValueSummary';
import { openProductSurface } from '../../shared/productInteraction';

interface Props {
  almacen: Almacen; estanterias: Estanteria[]; niveles: NivelEstanteria[]; cajas: Caja[]; elementos: Elemento[];
  canAdmin: boolean;
  onEditWarehouse: () => void; onNewRack: () => void; onEditRack: (id: string) => void;
  onNewLevel: (rackId: string) => void; onEditLevel: (id: string) => void;
  onNewBox: (levelId: string) => void; onEditBox: (id: string) => void;
}
export function WarehouseTree(props: Props) {
  const { openItemDetail } = useInventory();
  return <WarehouseTreeContent {...props} openItemDetail={openItemDetail} />;
}
export function WarehouseTreeContent({ almacen, estanterias, niveles, cajas, elementos, canAdmin, onEditWarehouse, onNewRack,
  onEditRack, onNewLevel, onEditLevel, onNewBox, onEditBox, openItemDetail }: Props & { openItemDetail: (item: Elemento) => void }) {
  const values = useMemo(() => inventoryLocationValues(elementos), [elementos]);
  const indexes = useMemo(() => {
    const rackItems = new Map<string, Elemento[]>(), byBox = new Map<string, Elemento[]>();
    const boxesByRack = new Map<string, Caja[]>(), levelsByRack = new Map<string, NivelEstanteria[]>();
    for (const item of elementos) if (item.almacenId === almacen.id) {
      if (item.estanteriaId) { const list = rackItems.get(item.estanteriaId) || []; list.push(item); rackItems.set(item.estanteriaId, list); }
      if (item.cajaId) { const list = byBox.get(item.cajaId) || []; list.push(item); byBox.set(item.cajaId, list); }
    }
    for (const box of cajas) if (box.estanteriaId) { const list = boxesByRack.get(box.estanteriaId) || []; list.push(box); boxesByRack.set(box.estanteriaId, list); }
    for (const level of niveles) { const list = levelsByRack.get(level.estanteriaId) || []; list.push(level); levelsByRack.set(level.estanteriaId, list); }
    return { rackItems, byBox, boxesByRack, levelsByRack };
  }, [elementos, almacen.id, cajas, niveles]);
  const racks = estanterias.filter(rack => rack.almacenId === almacen.id);
  const unassigned = elementos.filter(item => item.almacenId === almacen.id && !item.estanteriaId);
  const itemLink = (item: Elemento, label = 'Sin caja') => <div key={item.id} data-product-id={item.id}
    onClick={event => openProductSurface(event, () => openItemDetail(item))} className="ui-product ui-product-line w-full min-w-0 p-3 text-left text-sm">
    <button type="button" onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${item.codigo} · ${item.nombre}`}
      className="ui-product-open block w-full break-words text-left font-semibold">{item.codigo} · {item.nombre}</button>
    <span className="block text-xs text-[#767682]">{label} · {item.cantidad} {item.unidad}{item.marca ? ` · ${item.marca}` : ''}</span></div>;
  const boxCard = (box: Caja) => <div key={box.id} className="min-w-0 border rounded-xl p-3 bg-[#f8fafc]">
    <div className="flex flex-wrap justify-between gap-2"><div className="font-bold text-sm">{box.codigoCaja}</div>
      {canAdmin && <button onClick={() => onEditBox(box.id)} className="text-xs text-[#253685]">Editar</button>}</div>
    <p className="text-xs text-[#767682]">{box.estado}</p>
    <LocationValueSummary values={values.boxes.get(box.id)} />
    <div className="space-y-3 mt-3">{(indexes.byBox.get(box.id) || []).map(item => itemLink(item, box.codigoCaja))}</div>
  </div>;
  return <section className="space-y-4">
    <div className="bg-white border rounded-2xl p-5 flex flex-wrap justify-between gap-3">
      <div><h3 className="text-xl font-bold">{almacen.nombre}</h3><p className="text-sm text-[#767682]">{almacen.codigo} · {almacen.ciudad} · {almacen.estado}</p></div>
      {canAdmin && <div className="responsive-actions w-full sm:w-auto"><button className="border rounded-lg px-3 py-2 text-sm" onClick={onEditWarehouse}>Editar almacén</button>
        <button className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm" onClick={onNewRack}>Nueva estantería</button></div>}
      <LocationValueSummary values={values.warehouses.get(almacen.id)} prominent />
      <p className="text-xs text-slate-500 w-full">{locationValueHint}</p>
    </div>
    {racks.map(rack => {
      const rackBoxes = indexes.boxesByRack.get(rack.id) || [], rackLevels = indexes.levelsByRack.get(rack.id) || [];
      const items = indexes.rackItems.get(rack.id) || [];
      const legacyBoxes = rackBoxes.filter(box => !box.nivelId), looseItems = items.filter(item => !item.nivelId && !item.cajaId);
      return <article key={rack.id} className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between gap-3"><div className="min-w-0 break-words"><h4 className="font-bold">{rack.nombre}</h4>
          <p className="text-xs text-[#767682]">{rack.codigo} · {items.length} artículos · {rackLevels.length} niveles · {rackBoxes.length} cajas</p></div>
          {canAdmin && <div className="responsive-actions w-full sm:w-auto"><button onClick={() => onEditRack(rack.id)} className="border rounded-lg px-2 py-1 text-xs">Editar</button>
            <button onClick={() => onNewLevel(rack.id)} className="border rounded-lg px-2 py-1 text-xs">Añadir nivel</button></div>}</div>
        <LocationValueSummary values={values.racks.get(rack.id)} />
        {rackLevels.map(level => <section key={level.id} data-level={level.id} className="border rounded-xl p-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between gap-3"><div><h5 className="font-semibold">Nivel {level.nombre}</h5><p className="text-xs text-slate-500">{level.codigo} · {level.descripcion}</p></div>
            {canAdmin && <div className="responsive-actions w-full sm:w-auto"><button onClick={() => onEditLevel(level.id)} className="border rounded-lg px-2 py-1 text-xs">Editar nivel</button>
              <button onClick={() => onNewBox(level.id)} className="border rounded-lg px-2 py-1 text-xs">Añadir caja</button></div>}</div>
          <LocationValueSummary values={values.levels.get(level.id)} />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {rackBoxes.filter(box => box.nivelId === level.id).map(boxCard)}
            {items.filter(item => item.nivelId === level.id && !item.cajaId).map(item => itemLink(item))}
          </div>
        </section>)}
        {(legacyBoxes.length > 0 || looseItems.length > 0) && <h5 className="text-sm font-semibold text-slate-600">Sin nivel asignado</h5>}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{legacyBoxes.map(boxCard)}{looseItems.map(item => itemLink(item, 'Sin nivel ni caja'))}</div>
        {!rackLevels.length && canAdmin && <p className="text-xs text-slate-500">Cree un nivel para añadir nuevas cajas. Puede asignar las cajas anteriores a un nivel al editarlas.</p>}
      </article>;
    })}
    {unassigned.length > 0 && <div className="bg-white border rounded-2xl p-4"><h4 className="font-bold">Sin estantería</h4>
      <div className="space-y-3 mt-3">{unassigned.map(item => itemLink(item, 'Sin estantería'))}</div></div>}
  </section>;
}
