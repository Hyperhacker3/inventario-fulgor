import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ActiveView } from '../types';

export const Header: React.FC = () => {
  const {
    user,
    elementos,
    openItemDetail,
    globalSearch,
    setGlobalSearch,
    activeView,
    setActiveView,
    setIsHelpModalOpen,
    dispatchCart,
    isCloudConnected,
    syncStatus
  } = useInventory();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic stock alerts
  const stockAlerts = React.useMemo(() => {
    return elementos
      .filter((item) => item.cantidad <= item.stockMinimo)
      .sort((a, b) => a.cantidad - b.cantidad);
  }, [elementos]);

  return (
    <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-30 flex-shrink-0 select-none">
      <div className="flex justify-between items-center px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 w-full max-w-[1400px] mx-auto">
        {/* Mobile menu button and brand */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            id="btn-mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#454651] p-1.5 hover:bg-[#f2f3ff] rounded-lg transition-colors shrink-0"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          
          <div 
            className="md:hidden flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => setActiveView('dashboard')}
          >
            <div className="w-7 h-7 rounded-lg bg-[#3e4e9e] flex items-center justify-center text-white text-xs font-bold shadow-2xs">
              <span className="material-symbols-outlined text-[16px]">solar_power</span>
            </div>
            <span className="font-bold text-[#253685] text-sm sm:text-base tracking-tight">FULGOR</span>
          </div>

          {/* Quick Search bar (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-3.5 py-1.5 w-48 md:w-80 focus-within:border-[#3e4e9e] focus-within:ring-1 focus-within:ring-[#3e4e9e] focus-within:bg-white transition-all shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-[#767682] mr-2">search</span>
            <input
              id="header-search-input"
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar SKU, elemento..."
              className="bg-transparent border-none focus:outline-hidden text-xs sm:text-sm w-full p-0 text-[#131b2e] placeholder-[#767682]"
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} className="text-[#767682] hover:text-[#131b2e] p-0.5">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Cloud Connection Badge */}
          <button
            id="btn-cloud-status"
            onClick={() => setIsHelpModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isCloudConnected
                ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                : 'bg-[#f8fafc] text-[#5f6368] border-[#dadce0] hover:bg-[#e8eaed]'
            }`}
            title={
              isCloudConnected
                ? 'Supabase Conectado en Tiempo Real'
                : 'Modo Local (Offline). Clic para ver guía de Supabase/Vercel'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#9aa0a6]'
              }`}
            />
            <span className="text-[11px]">
              {isCloudConnected ? 'Supabase Activo' : 'Modo Local'}
            </span>
          </button>

          {/* Notifications button */}
          <div className="relative">
            <button
              id="btn-notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#454651] hover:text-[#253685] hover:bg-[#f2f3ff] transition-colors relative"
              title="Notificaciones de inventario"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {stockAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#dd4c42] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                  {stockAlerts.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] mb-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#454651]">Alertas de Stock</h4>
                    <span className="text-[10px] font-bold bg-[#fce8e6] text-[#c5221f] px-1.5 py-0.2 rounded-full">
                      {stockAlerts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-[#767682] hover:text-[#131b2e]"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {stockAlerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#137333] bg-[#e6f4ea] rounded-xl font-medium">
                      Todo el inventario cuenta con stock óptimo.
                    </div>
                  ) : (
                    stockAlerts.slice(0, 10).map((alertItem) => {
                      const isOut = alertItem.cantidad === 0;
                      return (
                        <div
                          key={alertItem.id}
                          onClick={() => {
                            openItemDetail(alertItem);
                            setShowNotifications(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:scale-[1.01] transition-all ${
                            isOut
                              ? 'bg-[#fce8e6] border-[#ffdad6]'
                              : 'bg-[#fef7e0] border-[#ffdf90]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`font-bold ${isOut ? 'text-[#ba1a1a]' : 'text-[#755b00]'}`}>
                              {isOut ? 'Stock Agotado' : 'Stock Bajo'}: {alertItem.codigo}
                            </p>
                            <span className="font-mono-code font-bold text-[11px] text-[#131b2e]">
                              {alertItem.cantidad} {alertItem.unidad}
                            </span>
                          </div>
                          <p className="text-[#454651] text-[11px] truncate mt-0.5">{alertItem.nombre}</p>
                          <p className="text-[#767682] text-[10px] mt-0.5">
                            Mínimo configurado: {alertItem.stockMinimo} {alertItem.unidad}
                          </p>
                        </div>
                      );
                    })
                  )}
                  {stockAlerts.length > 10 && (
                    <p className="text-center text-[10px] text-[#767682] pt-1">
                      +{stockAlerts.length - 10} elementos más con bajo stock
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            id="btn-header-help"
            onClick={() => setIsHelpModalOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#454651] hover:text-[#253685] hover:bg-[#f2f3ff] transition-colors"
            title="Ayuda y especificaciones"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          <div className="h-4 sm:h-5 w-px bg-[#e2e8f0] mx-0.5 sm:mx-1"></div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#131b2e] leading-tight">{user.name}</span>
              <span className="text-[10px] text-[#454651]">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#cbd5e1] shrink-0 shadow-2xs">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#e2e8f0] px-4 py-3 shadow-lg animate-in slide-in-from-top duration-150">
          {/* Mobile Search */}
          <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-[#767682] mr-2">search</span>
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar en todo el inventario..."
              className="bg-transparent border-none focus:outline-hidden text-xs w-full text-[#131b2e]"
            />
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { id: 'dashboard' as ActiveView, label: 'Dashboard General', icon: 'dashboard' },
              { id: 'explorer' as ActiveView, label: 'Explorador de Inventario', icon: 'inventory_2' },
              { id: 'new-item' as ActiveView, label: 'Registrar Nuevo Item', icon: 'add_box' },
              { id: 'dispatch' as ActiveView, label: 'Despacho & Salida', icon: 'shopping_cart_checkout', badge: dispatchCart.length },
              { id: 'history' as ActiveView, label: 'Historial de Movimientos', icon: 'history' },
              { id: 'warehouses' as ActiveView, label: 'Almacenes & Estanterías', icon: 'warehouse' },
              { id: 'remissions' as ActiveView, label: 'Remisiones Oficiales', icon: 'picture_as_pdf' },
            ].map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-xl text-left transition-colors ${
                    isActive
                      ? 'bg-[#eaedff] text-[#253685] font-bold'
                      : 'text-[#454651] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
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
        </div>
      )}
    </header>
  );
};

