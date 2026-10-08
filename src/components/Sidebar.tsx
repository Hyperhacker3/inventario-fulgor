import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { navigationItems, navigationIsActive } from '../domain/navigation';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../lib/supabase';
import { StateIcon } from './ui/StateIcon';
import { DEFAULT_COMPANY } from '../domain/company';

export const Sidebar: React.FC = () => {
  const { signOut } = useAuth();
  const { navigationView: activeView, setActiveView, dispatchCart, setIsHelpModalOpen, user, company } = useInventory();

  const navItems = navigationItems(user.role, dispatchCart.length, isDemo);

  return (
    <aside className="app-sidebar bg-white border-r border-[#e2e8f0] h-full w-64 fixed left-0 top-0 z-40 flex flex-col py-6 px-4 hidden xl:flex select-none">
      {/* Brand Header */}
      <button type="button" aria-label={`${company.nombre} — Ir al inicio`} className="ui-brand-button mb-6 px-2" onClick={() => setActiveView('dashboard')}>
        <img src={company.logo} alt={company.nombre} width="303" height="131" className={`${company.logo === DEFAULT_COMPANY.logo ? 'brand-logo' : ''} w-full h-auto max-h-28 object-contain`} />
      </button>

      {/* Navigation Links */}
      <nav className="app-nav-scroll flex-1 flex flex-col overflow-y-auto">
        {navItems.map((item) => {
          const isActive = navigationIsActive(item, activeView);
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              data-nav-view={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveView(item.id)}
              className={`ui-sidebar-action w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left ${
                isActive
                  ? 'font-bold'
                  : 'font-normal'
              }`}
            >
              <div className="flex items-center gap-3">
                <StateIcon icon={item.icon} filled={isActive} className="text-[20px]" />
                <span className="text-[14px]">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-[#dd4c42] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto pt-4 border-t border-[#e2e8f0] flex flex-col gap-1">
        <button
          id="btn-sidebar-help"
          data-nav-view="help"
          onClick={() => setIsHelpModalOpen(true)}
          className="ui-sidebar-action w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left"
        >
          <StateIcon icon="help" className="text-[20px]" />
          <span className="text-[14px]">Ayuda y Guía</span>
        </button>
        <button
          id="btn-sidebar-logout"
          data-nav-view="logout"
          onClick={() => { void signOut(); }}
          className="ui-sidebar-action ui-sidebar-logout w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left"
        >
          <StateIcon icon="logout" className="text-[20px]" />
          <span className="text-[14px]">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
