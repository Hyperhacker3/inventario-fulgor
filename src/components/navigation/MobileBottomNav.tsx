import type { ActiveView } from '../../types';
import { navigationIsActive, type NavigationItem } from '../../domain/navigation';

export function MobileBottomNav({ items, activeView, onNavigate, keyboardOpen }: { items: NavigationItem[]; activeView: ActiveView; onNavigate: (view: ActiveView) => void; keyboardOpen: boolean }) {
  return <nav aria-label="Accesos frecuentes" className="mobile-bottom-nav xl:hidden" data-keyboard={keyboardOpen} aria-hidden={keyboardOpen} inert={keyboardOpen}>
    {items.map(item => <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-current={navigationIsActive(item, activeView) ? 'page' : undefined}
      className="ui-sidebar-action relative min-w-0 flex-1 flex flex-col items-center justify-center gap-1 min-h-14 rounded-xl">
      <span className="relative"><span className="material-symbols-outlined text-[24px]" aria-hidden="true">{item.icon}</span>
        {!!item.badge && <span className="absolute -top-1 -right-3 rounded-full bg-red-600 text-white text-[10px] px-1.5">{item.badge}</span>}
      </span><span className="text-xs">{item.label}</span>
    </button>)}
  </nav>;
}
