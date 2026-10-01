import type { Elemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { available } from '../../domain/inventory';
import { isDemo } from '../../lib/supabase';
import { ItemImage } from '../ItemImage';

export function DashboardCard({ item }: { item: Elemento }) {
  const { user, getLocationString, openItemDetail, addToDispatchCart, setActiveView } = useInventory();
  const free = available(item);
  const low = free > 0 && free <= item.stockMinimo;
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);
  return <article id={`inventory-card-${item.codigo}`} className="bg-white rounded-xl border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
    <button type="button" onClick={() => openItemDetail(item)} className="aspect-4/3 bg-[#f8fafc] relative border-b overflow-hidden text-left">
      {item.fotoUrl ? <ItemImage source={item.fotoUrl} alt={item.nombre} className="w-full h-full object-cover" /> :
        <span className="w-full h-full flex flex-col items-center justify-center text-[#94a3b8]">
          <span className="material-symbols-outlined text-4xl">solar_power</span><span className="text-xs">{item.categoria}</span>
        </span>}
      <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-white text-xs font-mono-code font-bold">{item.codigo}</span>
    </button>
    <div className="p-5 flex flex-col flex-1 gap-3">
      <button type="button" onClick={() => openItemDetail(item)} className="text-left font-bold text-[#131b2e] hover:text-[#3e4e9e] truncate" title={item.nombre}>{item.nombre}</button>
      <p className="text-xs text-[#454651] truncate" title={getLocationString(item)}>{getLocationString(item)}</p>
      <div className="mt-auto flex items-center justify-between p-2.5 rounded-lg bg-[#f8fafc] text-xs">
        <span>Disponible</span><strong className={free === 0 ? 'text-[#c5221f]' : low ? 'text-[#b06000]' : 'text-[#137333]'}>{free} {item.unidad}</strong>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#eaedff] overflow-hidden"><div className={`h-full ${free === 0 ? 'bg-[#dd4c42]' : low ? 'bg-[#f2c43a]' : 'bg-[#10b981]'}`}
        style={{ width: `${Math.min(100, item.stockMinimo > 0 ? free / (item.stockMinimo * 3) * 100 : free > 0 ? 100 : 0)}%` }} /></div>
      <div className="flex gap-2">
        <button type="button" id={`btn-edit-${item.codigo}`} onClick={() => openItemDetail(item)} className="flex-1 bg-[#3e4e9e] text-white text-xs py-2 rounded-lg">Detalles</button>
        {canOperate && <button type="button" id={`btn-dispatch-${item.codigo}`} disabled={free === 0}
          onClick={() => { addToDispatchCart(item); setActiveView('dispatch'); }}
          className="flex-1 bg-[#dd4c42] text-white text-xs py-2 rounded-lg disabled:opacity-40">Salida</button>}
      </div>
    </div>
  </article>;
}
