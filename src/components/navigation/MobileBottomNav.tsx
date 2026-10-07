import { StateIcon } from '../ui/StateIcon';
import type { ActiveView } from '../../types';
import { navigationIsActive, type NavigationItem } from '../../domain/navigation';

export function MobileBottomNav({ items, activeView, onNavigate, keyboardOpen }: { items: NavigationItem[]; activeView: ActiveView; onNavigate: (view: ActiveView) => void; keyboardOpen: boolean }) {
  return <nav aria-label="Accesos frecuentes" className="mobile-bottom-nav xl:hidden" data-keyboard={keyboardOpen} aria-hidden={keyboardOpen} inert={keyboardOpen}>
    {items.map(item => <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-current={navigationIsActive(item, activeView) ? 'page' : undefined}
      aria-label={item.label} title={item.label} data-nav-view={item.id}
      className="ui-sidebar-action relative min-w-0 flex-1 flex items-center justify-center min-h-12 rounded-xl">
      <span className="relative"><StateIcon icon={item.icon} filled={navigationIsActive(item, activeView)} className="text-[24px]" />
        {!!item.badge && <span className="absolute -top-1 -right-3 rounded-full bg-red-600 text-white text-[10px] px-1.5">{item.badge}</span>}
      </span>
    </button>)}
  </nav>;
}
