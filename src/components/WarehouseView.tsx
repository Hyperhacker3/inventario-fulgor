import { Presence } from './ui/Motion';
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { WarehouseTree } from './warehouses/WarehouseTree';
import { WarehouseFormModal, type WarehouseFormTarget } from './warehouses/WarehouseFormModal';
import { isDemo } from '../lib/supabase';

export function WarehouseView() {
  const { almacenes, estanterias, cajas, elementos, user } = useInventory();
  const canAdmin = isDemo || user.role === 'admin';
  const [selectedId, setSelectedId] = useState(almacenes[0]?.id || '');
  const [form, setForm] = useState<WarehouseFormTarget | null>(null);
  const effectiveId = almacenes.some(a => a.id === selectedId) ? selectedId : almacenes[0]?.id || '';
  const selected = almacenes.find(a => a.id === effectiveId);
  const counts = new Map<string, number>();
  for (const item of elementos) if (item.almacenId) counts.set(item.almacenId, (counts.get(item.almacenId) || 0) + 1);
  return <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full">
    <header className="flex flex-wrap justify-between gap-3 mb-6">
      <div><h2 className="text-2xl md:text-3xl font-bold text-[#131b2e]">Gestión de Almacenes</h2>
        <p className="text-sm text-[#454651]">Ubicaciones de material: almacén, estantería y caja.</p></div>
      {canAdmin && <button id="btn-add-warehouse" onClick={() => setForm({ kind: 'almacen', mode: 'new' })}
        className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white font-semibold">Añadir almacén</button>}
    </header>
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <aside className="bg-white rounded-2xl border p-3 space-y-2 h-fit">
        {almacenes.map(alm => <button key={alm.id} onClick={() => setSelectedId(alm.id)}
          className={`w-full text-left rounded-xl p-3 border ${effectiveId === alm.id ? 'border-[#3e4e9e] bg-[#eaedff]' : 'border-transparent hover:bg-[#f8fafc]'}`}>
          <span className="font-bold block">{alm.nombre}</span><span className="text-xs text-[#767682]">{alm.codigo} · {alm.ciudad} · {counts.get(alm.id) || 0} artículos</span>
        </button>)}
        {!almacenes.length && <p className="p-3 text-sm">No hay almacenes.</p>}
      </aside>
      {selected ? <WarehouseTree almacen={selected} estanterias={estanterias} cajas={cajas} elementos={elementos}
        canAdmin={canAdmin}
        onEditWarehouse={() => setForm({ kind: 'almacen', mode: 'edit', id: selected.id })}
        onNewRack={() => setForm({ kind: 'estanteria', mode: 'new', parentId: selected.id })}
        onEditRack={id => setForm({ kind: 'estanteria', mode: 'edit', id })}
        onNewBox={id => setForm({ kind: 'caja', mode: 'new', parentId: id })}
        onEditBox={id => setForm({ kind: 'caja', mode: 'edit', id })} />
        : <div className="bg-white rounded-2xl border p-8 text-sm">Seleccione un almacén.</div>}
    </div>
    <Presence open={canAdmin && !!form}>{canAdmin && form && <WarehouseFormModal target={form} onClose={() => setForm(null)} onCreatedWarehouse={setSelectedId} />}</Presence>
  </div>;
}
