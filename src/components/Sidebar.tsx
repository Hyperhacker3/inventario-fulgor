import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { ActiveView } from '../types';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, dispatchCart, setIsHelpModalOpen } = useInventory();

  const navItems: { id: ActiveView; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'explorer', label: 'Inventario', icon: 'inventory_2' },
    { id: 'new-item', label: 'Nuevo Item', icon: 'add_box' },
    { id: 'dispatch', label: 'Despacho', icon: 'shopping_cart_checkout', badge: dispatchCart.length },
    { id: 'history', label: 'Historial', icon: 'history' },
    { id: 'warehouses', label: 'Almacenes', icon: 'warehouse' },
    { id: 'remissions', label: 'Remisiones', icon: 'picture_as_pdf' },
  ];

  return (
    <aside className="bg-white border-r border-[#e2e8f0] h-full w-64 fixed left-0 top-0 z-40 flex flex-col py-6 px-4 hidden md:flex select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 px-2 cursor-pointer" onClick={() => setActiveView('dashboard')}>
        <div className="w-10 h-10 rounded-full bg-[#3e4e9e] flex items-center justify-center text-white shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            solar_power
          </span>
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#253685] leading-tight tracking-tight">FULGOR S.A.S.</h1>
          <p className="text-[11px] font-bold tracking-wider text-[#454651] uppercase">Logística Solar</p>
        </div>
      </div>

      {/* Primary CTA Button */}
      <button
        id="btn-nueva-remision"
        onClick={() => setActiveView('dispatch')}
        className="w-full bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-[0.98] transition-all rounded-lg py-2.5 px-4 mb-6 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Nueva Remisión</span>
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
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
          onClick={() => {
            alert('Sesión activa de Carlos Ramírez (Jefe de Bodega Central). FULGOR S.A.S.');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#454651] hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a] rounded-xl transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[14px]">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
