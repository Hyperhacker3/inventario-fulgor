import { useRef } from 'react';
import type { ActiveView } from '../../types';
import { navigationIsActive, type NavigationItem } from '../../domain/navigation';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface Props {
  open: boolean; onClose: () => void; items: NavigationItem[]; activeView: ActiveView;
  onNavigate: (view: ActiveView) => void; search: string; onSearch: (value: string) => void;
  onHelp: () => void; onSignOut: () => void; error?: string;
}
export function MobileMenu({ open, onClose, items, activeView, onNavigate, search, onSearch, onHelp, onSignOut, error }: Props) {
  const panel = useRef<HTMLElement>(null);
  useDialogFocus(panel, onClose, open);
  return <div className="mobile-menu-layer xl:hidden" data-open={open} aria-hidden={!open} inert={!open}>
    <button type="button" className="mobile-menu-backdrop" aria-label="Cerrar menú al tocar fuera" tabIndex={-1} onClick={onClose} />
    <section id="mobile-navigation" ref={panel} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" className="mobile-menu-panel">
      <div className="flex justify-between items-center gap-4 mb-3">
        <h2 id="mobile-menu-title" className="font-bold text-lg">Menú</h2>
        <button type="button" data-dialog-close aria-label="Cerrar menú" onClick={onClose} className="w-11 h-11 rounded-xl hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
      </div>
      <form className="flex items-center border rounded-xl bg-slate-50 px-3 mb-3" onSubmit={event => { event.preventDefault(); onNavigate('explorer'); }}>
        <input aria-label="Buscar en el inventario" type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar producto o código…" className="min-w-0 w-full bg-transparent py-3 outline-none" />
        <button type="submit" aria-label="Buscar" className="w-11 h-11 shrink-0"><span className="material-symbols-outlined">search</span></button>
      </form>
      <nav aria-label="Todas las pantallas" className="flex flex-col gap-1">
        {items.map(item => <button key={item.id} type="button" aria-current={navigationIsActive(item, activeView) ? 'page' : undefined} onClick={() => onNavigate(item.id)}
          className={`flex items-center gap-3 text-left min-h-12 px-3 py-2 rounded-xl ${navigationIsActive(item, activeView) ? 'bg-[#eaedff] text-[#253685] font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
          <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span><span className="flex-1">{item.label}</span>
          {!!item.badge && <span className="rounded-full bg-red-600 text-white text-xs px-2 py-1">{item.badge}</span>}
        </button>)}
      </nav>
      <div className="border-t mt-3 pt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onHelp} className="flex items-center justify-center gap-2 min-h-12 rounded-xl hover:bg-slate-50 text-sm"><span className="material-symbols-outlined">help</span>Ayuda</button>
        <button type="button" onClick={onSignOut} className="flex items-center justify-center gap-2 min-h-12 rounded-xl hover:bg-red-50 text-sm text-red-700"><span className="material-symbols-outlined">logout</span>Cerrar sesión</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
    </section>
  </div>;
}
