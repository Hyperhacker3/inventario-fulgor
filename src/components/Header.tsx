import { Presence } from './ui/Motion';
import React, { useEffect, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ActiveView } from '../types';
import { isDemo } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { navigationItems } from '../domain/navigation';
import { MobileMenu } from './navigation/MobileMenu';
import { errorMessage } from '../shared/errors';
import { ThemeToggle } from './ThemeToggle';

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
    isCloudConnected
  } = useInventory();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { signOut } = useAuth();
  const [menuError, setMenuError] = useState('');
  const navigate = (view: ActiveView) => {
    if (document.activeElement instanceof HTMLElement && document.activeElement.matches('input, textarea')) document.activeElement.blur();
    setActiveView(view); setMobileMenuOpen(false); setShowNotifications(false);
  };
  useEffect(() => {
    const close = () => { setMobileMenuOpen(false); setShowNotifications(false); };
    const desktop = window.matchMedia('(min-width: 1280px)');
    const resize = () => { if (desktop.matches) close(); };
    window.addEventListener('hashchange', close);
    window.addEventListener('popstate', close);
    desktop.addEventListener('change', resize);
    return () => { window.removeEventListener('hashchange', close); window.removeEventListener('popstate', close); desktop.removeEventListener('change', resize); };
  }, []);
  useEffect(() => {
    if (!showNotifications) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowNotifications(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [showNotifications]);

  // Dynamic stock alerts
  const stockAlerts = React.useMemo(() => {
    return elementos
      .filter((item) => item.cantidad <= item.stockMinimo)
      .sort((a, b) => a.cantidad - b.cantidad);
  }, [elementos]);

  return (
    <header className="app-header bg-white border-b border-[#e2e8f0] sticky top-0 z-40 flex-shrink-0 select-none">
      <div className="flex justify-between items-center px-3 sm:px-4 lg:px-8 h-20 xl:h-auto py-2.5 xl:py-3 w-full max-w-[1400px] mx-auto">
        {/* Mobile menu button and brand */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            id="btn-mobile-menu"
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setShowNotifications(false); }}
            className="xl:hidden text-[#454651] w-11 h-11 flex items-center justify-center hover:bg-[#f2f3ff] rounded-lg transition-colors shrink-0"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation"
          >
            <span className="hamburger" data-open={mobileMenuOpen} aria-hidden="true"><span /><span /><span /></span>
          </button>
          
          <button
            type="button"
            aria-label="EL TURPIAL — Ir al inicio"
            className="xl:hidden flex items-center shrink-0"
            onClick={() => navigate('dashboard')}
          >
            <img src="/logo-completo.png" alt="EL TURPIAL" width="303" height="131" className="brand-logo w-28 sm:w-32 h-auto object-contain" />
          </button>

          {/* Quick Search bar (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-3.5 py-1.5 w-48 lg:w-80 focus-within:border-[#3e4e9e] focus-within:ring-1 focus-within:ring-[#3e4e9e] focus-within:bg-white transition-all shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-[#767682] mr-2">search</span>
            <input
              id="header-search-input"
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && globalSearch.trim()) navigate('explorer'); }}
              placeholder="Buscar SKU, elemento..."
              className="bg-transparent border-none focus:outline-hidden text-xs sm:text-sm w-full p-0 text-[#131b2e] placeholder-[#767682]"
            />
            {globalSearch && (
              <button aria-label="Limpiar búsqueda" onClick={() => setGlobalSearch('')} className="text-[#767682] hover:text-[#131b2e] p-0.5">
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
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isCloudConnected
                ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                : 'bg-[#f8fafc] text-[#5f6368] border-[#dadce0] hover:bg-[#e8eaed]'
            }`}
            title={
              isCloudConnected
                ? 'Supabase Conectado en Tiempo Real'
                : 'Sin conexión en tiempo real. Ver ayuda'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#9aa0a6]'
              }`}
            />
            <span className="text-[11px]">
              {isCloudConnected ? 'Supabase Activo' : 'Sin conexión'}
            </span>
          </button>

          {/* Notifications button */}
          <ThemeToggle />
          <div className="relative">
            <button
              id="btn-notifications"
              onClick={() => { setShowNotifications(!showNotifications); setMobileMenuOpen(false); }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#454651] hover:text-[#253685] hover:bg-[#f2f3ff] transition-colors relative"
              title="Notificaciones de inventario" aria-label="Notificaciones de inventario" aria-expanded={showNotifications}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {stockAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#dd4c42] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                  {stockAlerts.length}
                </span>
              )}
            </button>

            <Presence open={showNotifications}>{showNotifications && <button type="button" tabIndex={-1} aria-label="Cerrar notificaciones al tocar fuera" onClick={() => setShowNotifications(false)} className="fixed inset-0 z-40 bg-black/10 cursor-default" />}
            {showNotifications && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-3.5 z-50 ui-panel-enter">
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
            )}</Presence>
          </div>

          {/* Help Button */}
          <button
            id="btn-header-help" aria-label="Ayuda"
            onClick={() => setIsHelpModalOpen(true)}
            className="hidden xl:flex w-11 h-11 rounded-full items-center justify-center text-[#454651] hover:text-[#253685] hover:bg-[#f2f3ff] transition-colors"
            title="Ayuda y especificaciones"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          <div className="h-4 sm:h-5 w-px bg-[#e2e8f0] mx-0.5 sm:mx-1"></div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-bold text-[#131b2e] leading-tight">{user.name}</span>
              <span className="text-[10px] text-[#454651]">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#cbd5e1] shrink-0 shadow-2xs">
              {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <span aria-label={user.name} className="w-full h-full grid place-items-center bg-[#eaedff] text-[#253685] text-sm font-bold">{user.name.slice(0, 1).toUpperCase()}</span>}
            </div>
          </div>
        </div>
      </div>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}
        items={navigationItems(user.role, dispatchCart.length, isDemo)} activeView={activeView}
        onNavigate={navigate} search={globalSearch} onSearch={setGlobalSearch}
        onHelp={() => { setMobileMenuOpen(false); setIsHelpModalOpen(true); }}
        themeAction={<ThemeToggle menu />}
        onSignOut={() => { void signOut().catch(cause => setMenuError(errorMessage(cause))); }} error={menuError} />
    </header>
  );
};

