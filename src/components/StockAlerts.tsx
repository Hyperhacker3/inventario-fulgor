import { useState } from 'react';
import type { Elemento } from '../types';

export function StockAlerts({ alerts, onItem }: { alerts: Elemento[]; onItem: (item: Elemento) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="flex flex-col gap-4 max-h-80 overflow-y-auto overscroll-contain p-3" aria-label="Alertas de stock">
    {!alerts.length && <p className="p-4 text-center text-xs text-[#137333] bg-[#e6f4ea] rounded-xl font-medium">Todo el inventario cuenta con stock óptimo.</p>}
    {(expanded ? alerts : alerts.slice(0, 10)).map(item => <button type="button" key={item.id} onClick={() => onItem(item)}
      className={`shrink-0 min-w-0 w-full p-3 rounded-xl border text-left text-xs leading-relaxed hover:border-[#3e4e9e] ${item.cantidad === 0 ? 'bg-[#fce8e6] border-[#ffdad6]' : 'bg-[#fef7e0] border-[#ffdf90]'}`}>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><strong className={`min-w-0 break-words ${item.cantidad === 0 ? 'text-[#ba1a1a]' : 'text-[#755b00]'}`}>
        {item.cantidad === 0 ? 'Stock Agotado' : 'Stock Bajo'}: {item.codigo}</strong>
        <span className="whitespace-nowrap font-mono-code font-bold text-[#131b2e]">{item.cantidad} {item.unidad}</span></span>
      <span className="block text-[#454651] mt-2 break-words">{item.nombre}{item.marca ? ` · ${item.marca}` : ''}</span>
      <span className="block text-[#767682] mt-1 break-words">Mínimo configurado: {item.stockMinimo} {item.unidad}</span>
    </button>)}
    {!expanded && alerts.length > 10 && <button type="button" onClick={() => setExpanded(true)} className="shrink-0 min-h-11 text-center text-xs text-[#253685] font-semibold">
      Ver los {alerts.length - 10} elementos más con bajo stock
    </button>}
    {expanded && <p role="status" className="shrink-0 text-xs text-slate-500 text-center">Mostrando las {alerts.length} alertas.</p>}
  </div>;
}
