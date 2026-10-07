/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Presence, ScreenTransition } from './components/ui/Motion';
import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { quickNavigationItems } from './domain/navigation';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { useMobileKeyboard } from './hooks/useMobileKeyboard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ThemeProvider } from './context/ThemeContext';
import { isDemo } from './lib/supabase';
import { AppInitialContent, AppLoadingScreen } from './components/AppLoadingScreen';
const DataAdministrationView = lazy(() => import('./components/DataAdministrationView').then(m => ({ default: m.DataAdministrationView })));
const DispatchQuantityModal = lazy(() => import('./components/dispatch/DispatchQuantityModal').then(m => ({ default: m.DispatchQuantityModal })));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const ExplorerView = lazy(() => import('./components/ExplorerView').then(m => ({ default: m.ExplorerView })));
const DispatchView = lazy(() => import('./components/DispatchView').then(m => ({ default: m.DispatchView })));
const EntryView = lazy(() => import('./components/EntryView').then(m => ({ default: m.EntryView })));
const HistoryView = lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const WarehouseView = lazy(() => import('./components/WarehouseView').then(m => ({ default: m.WarehouseView })));
const RemissionView = lazy(() => import('./components/RemissionView').then(m => ({ default: m.RemissionView })));
const PdfRemissionModal = lazy(() => import('./components/PdfRemissionModal').then(m => ({ default: m.PdfRemissionModal })));
const ItemDetailModal = lazy(() => import('./components/ItemDetailModal').then(m => ({ default: m.ItemDetailModal })));
const QuickMovementModal = lazy(() => import('./components/QuickMovementModal').then(m => ({ default: m.QuickMovementModal })));
const HelpModal = lazy(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));
const OutgoingPhotoModal = lazy(() => import('./components/history/OutgoingPhotoModal').then(m => ({ default: m.OutgoingPhotoModal })));

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
    dispatchSelection, dispatchSelectionItem, closeDispatchSelection, addToDispatchCart, dispatchFeedback,
    selectedOutgoingPhotosId, closeOutgoingPhotos,
    user
  } = useInventory();
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);

  const renderActiveView = () => {
    if (activeView === 'entries' && !canOperate) return <p className="p-8" role="alert">Su cuenta no puede registrar entradas.</p>;
    if (activeView === 'dispatch' && !canOperate) return <p className="p-8" role="alert">Su cuenta no puede realizar salidas.</p>;
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'explorer':
        return <ExplorerView />;
      case 'dispatch':
        return <DispatchView />;
      case 'entries':
        return <EntryView />;
      case 'history':
        return <HistoryView />;
      case 'warehouses':
        return <WarehouseView />;
      case 'projects':
        return <DataAdministrationView initialTab="projects" />;
      case 'data-admin':
        return <DataAdministrationView />;
      case 'remissions':
        return <RemissionView />;
      default:
        return <DashboardView />;
    }
  };

  const mobileNavItems = quickNavigationItems(user.role, dispatchCart.length, isDemo);
  const keyboardOpen = useMobileKeyboard();
  const pageScroll = useRef<HTMLElement>(null);
  useLayoutEffect(() => { if (pageScroll.current) pageScroll.current.scrollTop = 0; }, [activeView]);

  return (
    <div className="app-viewport flex w-full overflow-hidden bg-[#faf8ff] text-[#131b2e]">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main content leaves room for the sidebar on desktop. */}
      <div className="flex-1 flex flex-col h-full xl:pl-64 overflow-hidden">
        <Header />
        <main ref={pageScroll} className={`app-main flex-1 min-h-0 overflow-y-auto relative ${keyboardOpen ? 'keyboard-open' : ''}`}>
          <ScreenTransition screen={activeView} className="app-screen min-h-full">{renderActiveView()}</ScreenTransition>
        </main>
        <MobileBottomNav items={mobileNavItems} activeView={activeView} keyboardOpen={keyboardOpen} onNavigate={setActiveView} />
      </div>

      {/* Global Modals */}
      {dispatchFeedback && <div role="status" className="fixed top-20 left-4 right-4 sm:left-auto sm:max-w-md z-[70] ui-panel-enter rounded-xl bg-green-50 border border-green-200 text-green-900 shadow-lg p-4 text-sm flex gap-2 items-center"><span className="material-symbols-outlined">check_circle</span>{dispatchFeedback.message}</div>}
      <Suspense fallback={null}><Presence open={!!selectedRemisionForPdf}>{selectedRemisionForPdf && <PdfRemissionModal
        remision={selectedRemisionForPdf}
        onClose={closePdfRemision}
      />}</Presence>
      <Presence open={!!selectedItemForDetail}>{selectedItemForDetail && <ItemDetailModal
        key={selectedItemForDetail.id}
        item={selectedItemForDetail}
        onClose={closeItemDetail}
      />}</Presence>
      <Presence open={!!quickMovementItem}>{quickMovementItem && <QuickMovementModal item={quickMovementItem} movementType={quickMovementType} key={`${quickMovementItem.id}:${quickMovementType}`} />}</Presence>
      <Presence open={isHelpModalOpen}>{isHelpModalOpen && <HelpModal />}</Presence></Suspense>
      <Suspense fallback={<div role="status" className="no-print fixed inset-0 z-[70] bg-black/60 grid place-items-center"><p className="bg-white rounded-xl p-6">Abriendo fotografías…</p></div>}><Presence open={!!selectedOutgoingPhotosId}>{selectedOutgoingPhotosId && <OutgoingPhotoModal key={selectedOutgoingPhotosId} remissionId={selectedOutgoingPhotosId} onClose={closeOutgoingPhotos} />}</Presence></Suspense>
      <Suspense fallback={<div role="status" className="fixed inset-0 z-[60] bg-black/60 grid place-items-center"><p className="bg-white p-6 rounded-xl">Preparando selección de cantidad…</p></div>}><Presence open={!!dispatchSelection && !!dispatchSelectionItem}>{dispatchSelection && dispatchSelectionItem && <DispatchQuantityModal key={dispatchSelection.token} item={dispatchSelectionItem} inCart={dispatchCart.find(line => line.elemento.id === dispatchSelectionItem.id)?.cantidad || 0} onClose={closeDispatchSelection} onConfirm={quantity => addToDispatchCart(dispatchSelectionItem, quantity)} />}</Presence></Suspense>
    </div>
  );
};

function ProtectedApp() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <AppLoadingScreen message="Cargando sesión…" />;
  if (!user) return <AuthScreen />;
  if (!isDemo && !['admin', 'operador', 'consulta'].includes(user.role)) return (
    <main className="min-h-screen grid place-content-center gap-4 p-8 text-center">
      <p role="alert">Esta cuenta aún no tiene un rol de inventario. Solicite acceso a un administrador.</p>
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { void signOut(); }}>Cerrar sesión</button>
    </main>
  );
  return (
    <InventoryProvider key={user.email}>
      <InventoryStartup />
    </InventoryProvider>
  );
}
function InventoryStartup() {
  const { startupStatus, retryInitialLoad } = useInventory();
  const { signOut } = useAuth();
  return <AppInitialContent status={startupStatus} onRetry={() => { void retryInitialLoad(); }} onSignOut={() => { void signOut(); }}><MainLayout /></AppInitialContent>;
}
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });
export default function App() { return <ThemeProvider><QueryClientProvider client={queryClient}><AuthProvider><ProtectedApp /></AuthProvider></QueryClientProvider></ThemeProvider>; }
