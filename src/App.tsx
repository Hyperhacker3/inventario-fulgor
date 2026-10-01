/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { ActiveView } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { isDemo } from './lib/supabase';
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const ExplorerView = lazy(() => import('./components/ExplorerView').then(m => ({ default: m.ExplorerView })));
const NewItemView = lazy(() => import('./components/NewItemView').then(m => ({ default: m.NewItemView })));
const DispatchView = lazy(() => import('./components/DispatchView').then(m => ({ default: m.DispatchView })));
const HistoryView = lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const WarehouseView = lazy(() => import('./components/WarehouseView').then(m => ({ default: m.WarehouseView })));
const RemissionView = lazy(() => import('./components/RemissionView').then(m => ({ default: m.RemissionView })));
const PdfRemissionModal = lazy(() => import('./components/PdfRemissionModal').then(m => ({ default: m.PdfRemissionModal })));
const ItemDetailModal = lazy(() => import('./components/ItemDetailModal').then(m => ({ default: m.ItemDetailModal })));
const QuickMovementModal = lazy(() => import('./components/QuickMovementModal').then(m => ({ default: m.QuickMovementModal })));
const HelpModal = lazy(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));

const MainLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    dispatchCart,
    selectedRemisionForPdf,
    closePdfRemision,
    selectedItemForDetail,
    closeItemDetail,
    quickMovementItem,
    quickMovementType,
    isHelpModalOpen,
    user
  } = useInventory();
  const canAdmin = isDemo || user.role === 'admin';
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);

  const renderActiveView = () => {
    if (activeView === 'new-item' && !canAdmin) return <p className="p-8" role="alert">Su cuenta no puede registrar componentes.</p>;
    if (activeView === 'dispatch' && !canOperate) return <p className="p-8" role="alert">Su cuenta no puede realizar despachos.</p>;
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'explorer':
        return <ExplorerView />;
      case 'new-item':
        return <NewItemView />;
      case 'dispatch':
        return <DispatchView />;
      case 'history':
        return <HistoryView />;
      case 'warehouses':
        return <WarehouseView />;
      case 'remissions':
        return <RemissionView />;
      default:
        return <DashboardView />;
    }
  };

  const mobileNavItems: { id: ActiveView; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
    { id: 'explorer', label: 'Inventario', icon: 'inventory_2' },
    ...(canOperate ? [{ id: 'dispatch' as ActiveView, label: 'Despacho', icon: 'shopping_cart_checkout', badge: dispatchCart.length }] : []),
    { id: 'history', label: 'Historial', icon: 'history' },
    { id: 'warehouses', label: 'Almacenes', icon: 'warehouse' },
    { id: 'remissions', label: 'Remisiones', icon: 'picture_as_pdf' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf8ff] text-[#131b2e]">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main Content Area (Offset by sidebar width on md+) */}
      <div className="flex-1 flex flex-col h-full md:pl-64 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative flex flex-col pb-20 md:pb-0">
          <Suspense fallback={<p className="p-8">Cargando vista…</p>}>{renderActiveView()}</Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] px-2 py-1.5 flex items-center justify-around shadow-lg select-none">
        {mobileNavItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#253685] font-bold'
                  : 'text-[#767682] hover:text-[#454651]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#dd4c42] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[14px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#3e4e9e] mt-1"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Global Modals */}
      <Suspense fallback={null}>{selectedRemisionForPdf && <PdfRemissionModal
        remision={selectedRemisionForPdf}
        onClose={closePdfRemision}
      />}
      {selectedItemForDetail && <ItemDetailModal
        key={selectedItemForDetail.id}
        item={selectedItemForDetail}
        onClose={closeItemDetail}
      />}
      {quickMovementItem && <QuickMovementModal key={`${quickMovementItem.id}:${quickMovementType}`} />}
      {isHelpModalOpen && <HelpModal />}</Suspense>
    </div>
  );
};

function ProtectedApp() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <p className="p-8">Cargando sesión…</p>;
  if (!user) return <AuthScreen />;
  if (!isDemo && !['admin', 'operador', 'consulta'].includes(user.role)) return (
    <main className="min-h-screen grid place-content-center gap-4 p-8 text-center">
      <p role="alert">Esta cuenta aún no tiene un rol de inventario. Solicite acceso a un administrador.</p>
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { void signOut(); }}>Cerrar sesión</button>
    </main>
  );
  return (
    <InventoryProvider key={user.email}>
      <MainLayout />
    </InventoryProvider>
  );
}
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });
export default function App() { return <QueryClientProvider client={queryClient}><AuthProvider><ProtectedApp /></AuthProvider></QueryClientProvider>; }
