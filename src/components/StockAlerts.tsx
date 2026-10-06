import { useState } from 'react';
import type { Elemento } from '../types';

export function StockAlerts({ alerts, onItem }: { alerts: Elemento[]; onItem: (item: Elemento) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="flex flex-col gap-2 max-h-72 overflow-y-auto overscroll-contain pr-1" aria-label="Alertas de stock">
    {!alerts.length && <p className="p-4 text-center text-xs text-[#137333] bg-[#e6f4ea] rounded-xl font-medium">Todo el inventario cuenta con stock óptimo.</p>}
    {(expanded ? alerts : alerts.slice(0, 10)).map(item => <button type="button" key={item.id} onClick={() => onItem(item)}
      className={`p-2.5 rounded-xl border text-left text-xs hover:border-[#3e4e9e] ${item.cantidad === 0 ? 'bg-[#fce8e6] border-[#ffdad6]' : 'bg-[#fef7e0] border-[#ffdf90]'}`}>
      <span className="flex flex-wrap items-center justify-between gap-2"><strong className={item.cantidad === 0 ? 'text-[#ba1a1a]' : 'text-[#755b00]'}>
        {item.cantidad === 0 ? 'Stock Agotado' : 'Stock Bajo'}: {item.codigo}</strong>
        <span className="font-mono-code font-bold text-[#131b2e]">{item.cantidad} {item.unidad}</span></span>
      <span className="block text-[#454651] mt-0.5 break-words">{item.nombre}{item.marca ? ` · ${item.marca}` : ''}</span>
      <span className="block text-[#767682] mt-0.5">Mínimo configurado: {item.stockMinimo} {item.unidad}</span>
    </button>)}
    {!expanded && alerts.length > 10 && <button type="button" onClick={() => setExpanded(true)} className="min-h-11 text-center text-xs text-[#253685] underline font-semibold">
      Ver los {alerts.length - 10} elementos más con bajo stock
    </button>}
    {expanded && <p role="status" className="text-xs text-slate-500 text-center">Mostrando las {alerts.length} alertas.</p>}
  </div>;
}
