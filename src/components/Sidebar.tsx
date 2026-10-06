import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { navigationItems } from '../domain/navigation';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../lib/supabase';

export const Sidebar: React.FC = () => {
  const { signOut } = useAuth();
  const { activeView, setActiveView, dispatchCart, setIsHelpModalOpen, user } = useInventory();
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);

  const navItems = navigationItems(user.role, dispatchCart.length, isDemo);

  return (
    <aside className="bg-white border-r border-[#e2e8f0] h-full w-64 fixed left-0 top-0 z-40 flex flex-col py-6 px-4 hidden xl:flex select-none">
      {/* Brand Header */}
      <button type="button" aria-label="EL TURPIAL — Ir al inicio" className="mb-6 px-2" onClick={() => setActiveView('dashboard')}>
        <img src="/logo-completo.png" alt="EL TURPIAL" width="303" height="131" className="w-full h-auto object-contain" />
      </button>

      {/* Primary CTA Button */}
      {canOperate && <button
        id="btn-nueva-remision"
        onClick={() => setActiveView('dispatch')}
        className="w-full bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-[0.98] transition-all rounded-lg py-2.5 px-4 mb-6 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Nueva Remisión</span>
      </button>}

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id || item.id === 'data-admin' && activeView === 'projects';
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
                isActive
                  ? 'bg-[#eaedff] text-[#253685] font-bold shadow-xs'
                  : 'text-[#454651] hover:bg-[#f2f3ff] hover:text-[#253685] hover:translate-x-0.5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
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
          onClick={() => setIsHelpModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#454651] hover:bg-[#f2f3ff] hover:text-[#253685] rounded-xl transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
          <span className="text-[14px]">Ayuda y Guía</span>
        </button>
        <button
          id="btn-sidebar-logout"
          onClick={() => { void signOut(); }}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#454651] hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a] rounded-xl transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[14px]">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
