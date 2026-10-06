import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ActiveView } from '../../types';
import { navigationIsActive, type NavigationItem } from '../../domain/navigation';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface Props {
  open: boolean; onClose: () => void; items: NavigationItem[]; activeView: ActiveView;
  onNavigate: (view: ActiveView) => void; search: string; onSearch: (value: string) => void;
  onHelp: () => void; onSignOut: () => void; error?: string;
  themeAction?: ReactNode;
  identity?: { name: string; cargo: string };
}
export function MobileMenu({ open, onClose, items, activeView, onNavigate, search, onSearch, onHelp, onSignOut, error, themeAction, identity }: Props) {
  const panel = useRef<HTMLElement>(null);
  useDialogFocus(panel, onClose, open);
  return createPortal(<div className="mobile-menu-layer xl:hidden" data-open={open} aria-hidden={!open} inert={!open}>
    <button type="button" className="mobile-menu-backdrop" aria-label="Cerrar menú al tocar fuera" tabIndex={-1} onClick={onClose} />
    <section id="mobile-navigation" ref={panel} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" className="mobile-menu-panel">
      <div className="flex shrink-0 justify-between items-center gap-3 mb-2">
        <h2 id="mobile-menu-title" className="font-bold text-base">Menú</h2>
        <button type="button" data-dialog-close aria-label="Cerrar menú" onClick={onClose} className="w-11 h-11 rounded-xl hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
      </div>
      <form autoComplete="off" className="flex shrink-0 items-center border rounded-xl bg-slate-50 px-3 mb-2" onSubmit={event => { event.preventDefault(); onNavigate('explorer'); }}>
        <input autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Buscar en el inventario" type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar producto…" className="min-w-0 w-full bg-transparent py-2 outline-none" />
        <button type="submit" aria-label="Buscar" className="w-11 h-11 shrink-0"><span className="material-symbols-outlined">search</span></button>
      </form>
      <nav aria-label="Todas las pantallas" className="min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-0.5">
        {items.map(item => <button key={item.id} type="button" aria-current={navigationIsActive(item, activeView) ? 'page' : undefined} onClick={() => onNavigate(item.id)}
          className={`flex shrink-0 items-center gap-2 text-left min-h-11 px-2 py-2 text-sm rounded-lg ${navigationIsActive(item, activeView) ? 'bg-[#eaedff] text-[#253685] font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
          <span className="material-symbols-outlined text-xl shrink-0" aria-hidden="true">{item.icon}</span><span className="flex-1 min-w-0">{item.label}</span>
          {!!item.badge && <span className="rounded-full bg-red-600 text-white text-xs px-2 py-1">{item.badge}</span>}
        </button>)}
      </nav>
      <div className="shrink-0 border-t mt-2 pt-2 grid grid-cols-2 gap-2">
        {identity && <div className="col-span-2 px-2 min-w-0"><p className="text-sm font-semibold break-words">{identity.name}</p><p className="text-xs text-slate-500">{identity.cargo}</p></div>}
        {themeAction && <div className="col-span-2">{themeAction}</div>}
        <button type="button" onClick={onHelp} className="flex items-center justify-center gap-2 min-h-12 rounded-xl hover:bg-slate-50 text-sm"><span className="material-symbols-outlined">help</span>Ayuda</button>
        <button type="button" onClick={onSignOut} className="flex items-center justify-center gap-2 min-h-12 rounded-xl hover:bg-red-50 text-sm text-red-700"><span className="material-symbols-outlined">logout</span>Cerrar sesión</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
    </section>
  </div>, document.body);
}
