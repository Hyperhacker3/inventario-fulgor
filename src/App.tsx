/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { ActiveView } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ExplorerView } from './components/ExplorerView';
import { NewItemView } from './components/NewItemView';
import { DispatchView } from './components/DispatchView';
import { HistoryView } from './components/HistoryView';
import { WarehouseView } from './components/WarehouseView';
import { RemissionView } from './components/RemissionView';
import { PdfRemissionModal } from './components/PdfRemissionModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { QuickMovementModal } from './components/QuickMovementModal';
import { HelpModal } from './components/HelpModal';

const MainLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    dispatchCart,
    selectedRemisionForPdf,
    closePdfRemision,
    selectedItemForDetail,
    closeItemDetail
  } = useInventory();

  const renderActiveView = () => {
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
    { id: 'dispatch', label: 'Despacho', icon: 'shopping_cart_checkout', badge: dispatchCart.length },
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
          {renderActiveView()}
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
      <PdfRemissionModal
        remision={selectedRemisionForPdf}
        onClose={closePdfRemision}
      />
      <ItemDetailModal
        item={selectedItemForDetail}
        onClose={closeItemDetail}
      />
      <QuickMovementModal />
      <HelpModal />
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <MainLayout />
    </InventoryProvider>
  );
}
