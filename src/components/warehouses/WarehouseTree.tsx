import { useMemo } from 'react';
import type { Almacen, Estanteria, Caja, Elemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { inventoryLocationValues } from '../../domain/money';
import { LocationValueSummary, locationValueHint } from './LocationValueSummary';

interface Props {
  almacen: Almacen; estanterias: Estanteria[]; cajas: Caja[]; elementos: Elemento[];
  canAdmin: boolean;
  onEditWarehouse: () => void; onNewRack: () => void; onEditRack: (id: string) => void;
  onNewBox: (rackId: string) => void; onEditBox: (id: string) => void;
}
export function WarehouseTree(props: Props) {
  const { openItemDetail } = useInventory();
  return <WarehouseTreeContent {...props} openItemDetail={openItemDetail} />;
}
export function WarehouseTreeContent({ almacen, estanterias, cajas, elementos, canAdmin, onEditWarehouse, onNewRack, onEditRack, onNewBox, onEditBox, openItemDetail }: Props & { openItemDetail: (item: Elemento) => void }) {
  const values = useMemo(() => inventoryLocationValues(elementos), [elementos]);
  const rackItems = useMemo(() => {
    const result = new Map<string, Elemento[]>();
    for (const item of elementos) if (item.almacenId === almacen.id && item.estanteriaId) {
      const list = result.get(item.estanteriaId) || []; list.push(item); result.set(item.estanteriaId, list);
    }
    return result;
  }, [elementos, almacen.id]);
  const boxesByRack = useMemo(() => {
    const result = new Map<string, Caja[]>();
    for (const box of cajas) if (box.estanteriaId) {
      const list = result.get(box.estanteriaId) || []; list.push(box); result.set(box.estanteriaId, list);
    }
    return result;
  }, [cajas]);
  const racks = estanterias.filter(rack => rack.almacenId === almacen.id);
  const unassigned = elementos.filter(item => item.almacenId === almacen.id && !item.estanteriaId);
  const byBox = useMemo(() => {
    const result = new Map<string, Elemento[]>();
    for (const item of elementos) if (item.almacenId === almacen.id && item.cajaId) {
      const list = result.get(item.cajaId) || []; list.push(item); result.set(item.cajaId, list);
    }
    return result;
  }, [elementos, almacen.id]);
  return <section className="space-y-4">
    <div className="bg-white border rounded-2xl p-5 flex flex-wrap justify-between gap-3">
      <div><h3 className="text-xl font-bold">{almacen.nombre}</h3><p className="text-sm text-[#767682]">{almacen.codigo} · {almacen.ciudad} · {almacen.estado}</p></div>
      {canAdmin && <div className="responsive-actions w-full sm:w-auto"><button className="border rounded-lg px-3 py-2 text-sm" onClick={onEditWarehouse}>Editar almacén</button>
        <button className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm" onClick={onNewRack}>Nueva estantería</button></div>}
      <LocationValueSummary values={values.warehouses.get(almacen.id)} prominent />
      <p className="text-xs text-slate-500 w-full">{locationValueHint}</p>
    </div>
    {racks.map(rack => {
      const rackBoxes = boxesByRack.get(rack.id) || [];
      const items = rackItems.get(rack.id) || [];
      return <article key={rack.id} className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between gap-3"><div className="min-w-0 break-words"><h4 className="font-bold">{rack.nombre}</h4>
          <p className="text-xs text-[#767682]">{rack.codigo} · {items.length} artículos · {rackBoxes.length} cajas</p></div>
          {canAdmin && <div className="responsive-actions w-full sm:w-auto"><button onClick={() => onEditRack(rack.id)} className="border rounded-lg px-2 py-1 text-xs">Editar</button>
            <button onClick={() => onNewBox(rack.id)} className="border rounded-lg px-2 py-1 text-xs">Añadir caja</button></div>}</div>
        <LocationValueSummary values={values.racks.get(rack.id)} />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rackBoxes.map(box => <div key={box.id} className="min-w-0 border rounded-xl p-3 bg-[#f8fafc]">
            <div className="flex flex-wrap justify-between gap-2"><div className="font-bold text-sm">{box.codigoCaja}</div>
              {canAdmin && <button onClick={() => onEditBox(box.id)} className="text-xs text-[#253685]">Editar</button>}</div>
            <p className="text-xs text-[#767682]">{box.estado}</p>
            <LocationValueSummary values={values.boxes.get(box.id)} />
            {(byBox.get(box.id) || []).map(item => <button key={item.id} onClick={() => openItemDetail(item)}
              className="block break-words text-left text-xs mt-2 hover:underline">{item.codigo} · {item.nombre} ({item.cantidad} {item.unidad})</button>)}
          </div>)}
          {items.filter(item => !item.cajaId).map(item => <button key={item.id} onClick={() => openItemDetail(item)}
            className="min-w-0 break-words border rounded-xl p-3 text-left text-sm hover:border-[#3e4e9e]">{item.codigo} · {item.nombre}<span className="block text-xs text-[#767682]">Sin caja · {item.cantidad} {item.unidad}</span></button>)}
        </div>
      </article>;
    })}
    {unassigned.length > 0 && <div className="bg-white border rounded-2xl p-4"><h4 className="font-bold">Sin estantería</h4>
      {unassigned.map(item => <button key={item.id} onClick={() => openItemDetail(item)} className="block break-words text-left text-sm py-1 hover:underline">{item.codigo} · {item.nombre}</button>)}</div>}
  </section>;
}
