import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { DashboardCard } from './dashboard/DashboardCard';
import { isDemo } from '../lib/supabase';

export const DashboardView: React.FC = () => {
  const {
    elementos,
    almacenes,
    getLocationString,
    setActiveView,
    globalSearch,
    user
  } = useInventory();

  const [localSearch, setLocalSearch] = useState('');
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nombre' | 'codigo' | 'stock-asc' | 'stock-desc'>('codigo');
  const [page, setPage] = useState(1);
  const [pageKey, setPageKey] = useState('');

  const effectiveSearch = (globalSearch || localSearch).toLowerCase().trim();

  // Filtered elements
  const filteredElementos = useMemo(() => {
    return elementos
      .filter((item) => {
        // Search filter
        if (effectiveSearch) {
          const matchCode = item.codigo.toLowerCase().includes(effectiveSearch);
          const matchName = item.nombre.toLowerCase().includes(effectiveSearch);
          const matchDesc = item.descripcion.toLowerCase().includes(effectiveSearch);
          const matchLoc = getLocationString(item).toLowerCase().includes(effectiveSearch);
          if (!matchCode && !matchName && !matchDesc && !matchLoc) return false;
        }

        // Warehouse filter
        if (selectedAlmacen !== 'ALL') {
          if (item.almacenId !== selectedAlmacen) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL') {
          if (item.categoria !== selectedCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'codigo') return a.codigo.localeCompare(b.codigo);
        if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'stock-asc') return a.cantidad - b.cantidad;
        if (sortBy === 'stock-desc') return b.cantidad - a.cantidad;
        return 0;
      });
  }, [elementos, effectiveSearch, selectedAlmacen, selectedCategory, sortBy, getLocationString]);
  const filterKey = `${effectiveSearch}|${selectedAlmacen}|${selectedCategory}|${sortBy}`;
  const currentPage = pageKey === filterKey ? page : 1;
  const pageCount = Math.max(1, Math.ceil(filteredElementos.length / 24));
  const visibleElementos = filteredElementos.slice((currentPage - 1) * 24, currentPage * 24);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Top Filter Bar from Mockup Image 13 */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
        {/* Search & Selectors */}
        <div className="flex-1 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767682] text-[18px]">
              search
            </span>
            <input
              id="dashboard-search"
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por código, nombre o ubicación..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] focus:border-[#3e4e9e] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <div className="relative flex-1 sm:min-w-[140px]">
              <select
                id="select-almacen"
                value={selectedAlmacen}
                onChange={(e) => setSelectedAlmacen(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white text-xs sm:text-sm py-2 pl-2.5 pr-7 focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] cursor-pointer text-[#131b2e] truncate"
              >
                <option value="ALL">Almacenes (Todos)</option>
                {almacenes.map((alm) => (
                  <option key={alm.id} value={alm.id}>
                    {alm.nombre}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#767682] text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="relative flex-1 sm:min-w-[140px]">
              <select
                id="select-categoria"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white text-xs sm:text-sm py-2 pl-2.5 pr-7 focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] cursor-pointer text-[#131b2e] truncate"
              >
                <option value="ALL">Categorías (Todas)</option>
                <option value="PANELES">Paneles Solares</option>
                <option value="INVERSORES">Inversores</option>
                <option value="ESTRUCTURAS">Estructuras</option>
                <option value="CABLES">Cableado Solar</option>
                <option value="CONECTORES">Conectores MC4</option>
                <option value="PROTECCIONES">Protecciones y Fusibles</option>
                <option value="BATERIAS">Baterías</option>
                <option value="OTROS">Otros Accesorios</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#767682] text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-[#f1f5f9]">
          <button
            id="btn-sort-toggle"
            onClick={() => {
              const options: ('codigo' | 'nombre' | 'stock-asc' | 'stock-desc')[] = ['codigo', 'nombre', 'stock-asc', 'stock-desc'];
              const next = options[(options.indexOf(sortBy) + 1) % options.length];
              setSortBy(next);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs sm:text-sm font-medium hover:bg-[#f8fafc] transition-colors shadow-2xs text-[#454651]"
            title={`Orden actual: ${sortBy}`}
          >
            <span className="material-symbols-outlined text-[16px]">swap_vert</span>
            <span>Ordenar</span>
          </button>

          {(isDemo || user.role === 'admin') && <button
            id="btn-new-item-cta"
            onClick={() => setActiveView('new-item')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#3e4e9e] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#323f80] transition-colors shadow-2xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nuevo Item</span>
          </button>}
        </div>
      </div>

      {/* Page Heading */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">Inventario General</h2>
          <p className="text-sm text-[#454651]">
            Resumen de componentes solares en stock ({filteredElementos.length} items registrados).
          </p>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredElementos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#3e4e9e] mb-4">
            <span className="material-symbols-outlined text-[32px]">inventory_2</span>
          </div>
          <h3 className="text-lg font-bold text-[#131b2e] mb-1">No se encontraron componentes</h3>
          <p className="text-sm text-[#454651] max-w-md mb-6">
            No hay elementos que coincidan con los filtros o el término de búsqueda actual.
          </p>
          <button
            onClick={() => {
              setLocalSearch('');
              setSelectedAlmacen('ALL');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 bg-[#3e4e9e] text-white rounded-lg text-sm font-semibold hover:bg-[#323f80] transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleElementos.map(item => <DashboardCard key={item.id} item={item} />)}
        </div>
      )}
      {pageCount > 1 && <nav aria-label="Páginas del inventario" className="flex items-center justify-center gap-3 py-5 text-sm">
        <button disabled={currentPage === 1} onClick={() => { setPageKey(filterKey); setPage(currentPage - 1); }} className="px-3 py-2 border rounded-lg disabled:opacity-40">Anterior</button>
        <span>{currentPage} / {pageCount}</span>
        <button disabled={currentPage === pageCount} onClick={() => { setPageKey(filterKey); setPage(currentPage + 1); }} className="px-3 py-2 border rounded-lg disabled:opacity-40">Siguiente</button>
      </nav>}
    </div>
  );
};
