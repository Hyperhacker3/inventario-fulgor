import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CategoriaElemento } from '../types';
import { ExplorerResults } from './explorer/ExplorerResults';
import { ExplorerFilters } from './explorer/ExplorerFilters';

export const ExplorerView: React.FC = () => {
  const {
    elementos,
    getLocationString,
    globalSearch
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Filters State
  const [selectedCategories, setSelectedCategories] = useState<Record<CategoriaElemento, boolean>>({
    PANELES: true,
    INVERSORES: true,
    ESTRUCTURAS: true,
    CABLES: true,
    CONECTORES: true,
    PROTECCIONES: true,
    BATERIAS: true,
    CONTROLADORES: true,
    ACCESORIOS: true,
    HERRAMIENTAS: true,
    SEGURIDAD_EPP: true,
    OTROS: true
  });

  const [stockStatusFilter, setStockStatusFilter] = useState<'todos' | 'disponible' | 'bajo' | 'agotado'>('todos');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  const effectiveSearch = (globalSearch || searchQuery).toLowerCase().trim();

  // Reset filters
  const handleClearFilters = () => {
    setSelectedCategories({
      PANELES: true,
      INVERSORES: true,
      ESTRUCTURAS: true,
      CABLES: true,
      CONECTORES: true,
      PROTECCIONES: true,
      BATERIAS: true,
      CONTROLADORES: true,
      ACCESORIOS: true,
      HERRAMIENTAS: true,
      SEGURIDAD_EPP: true,
      OTROS: true
    });
    setStockStatusFilter('todos');
    setSelectedWarehouseId('ALL');
    setSearchQuery('');
  };

  const handleCategoryToggle = (cat: CategoriaElemento) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const deactivatedCats = Object.values(selectedCategories).filter((v) => !v).length;
    if (deactivatedCats > 0) count += 1;
    if (stockStatusFilter !== 'todos') count += 1;
    if (selectedWarehouseId !== 'ALL') count += 1;
    if (searchQuery.trim()) count += 1;
    return count;
  }, [selectedCategories, stockStatusFilter, selectedWarehouseId, searchQuery]);

  // Filter items
  const filteredItems = useMemo(() => {
    return elementos.filter((item) => {
      // Search
      if (effectiveSearch) {
        const matchCode = item.codigo.toLowerCase().includes(effectiveSearch);
        const matchName = item.nombre.toLowerCase().includes(effectiveSearch);
        const matchDesc = item.descripcion.toLowerCase().includes(effectiveSearch);
        const matchLoc = getLocationString(item).toLowerCase().includes(effectiveSearch);
        if (!matchCode && !matchName && !matchDesc && !matchLoc) return false;
      }

      // Category
      if (!selectedCategories[item.categoria]) {
        return false;
      }

      // Stock status
      if (stockStatusFilter === 'disponible' && item.cantidad <= 0) return false;
      if (stockStatusFilter === 'bajo' && (item.cantidad > item.stockMinimo || item.cantidad === 0)) return false;
      if (stockStatusFilter === 'agotado' && item.cantidad > 0) return false;

      // Warehouse
      if (selectedWarehouseId !== 'ALL' && item.almacenId !== selectedWarehouseId) {
        return false;
      }

      return true;
    });
  }, [elementos, effectiveSearch, selectedCategories, stockStatusFilter, selectedWarehouseId, getLocationString]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 24));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * 24, currentPage * 24);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-3 sm:p-4 md:p-8 max-w-[1400px] mx-auto w-full gap-4 sm:gap-6">
      {/* Prominent Search Header Section (Matching Mockup Image 9) */}
      <div className="w-full bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#131b2e] mb-1 tracking-tight">
          Explorador de Componentes
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-[#454651] mb-4 sm:mb-6">
          Encuentre rápidamente inventario fotovoltaico por código, nombre o atributos específicos.
        </p>

        {/* Prominent Search Bar */}
        <div className="relative w-full flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#767682]">
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">search</span>
          </div>
          <input
            id="explorer-prominent-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar código (ej. PAN550) o nombre..."
            className="w-full pl-10 sm:pl-12 pr-20 sm:pr-28 py-2.5 sm:py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs sm:text-base text-[#131b2e] focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] focus:border-transparent focus:bg-white transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#767682] hover:text-[#131b2e] px-2.5 py-1.5 text-xs font-semibold"
                title="Limpiar búsqueda"
              >
                Limpiar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('explorer-prominent-search');
                el?.focus();
              }}
              className="bg-[#3e4e9e] text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-[#323f80] transition-colors shadow-xs"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-[#e2e8f0]">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="flex items-center gap-2 text-xs font-bold text-[#253685]"
        >
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          <span>{mobileFiltersOpen ? 'Ocultar Filtros' : 'Mostrar Filtros de Búsqueda'}</span>
          {activeFiltersCount > 0 && (
            <span className="bg-[#3e4e9e] text-white text-[10px] px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-[11px] text-[#dd4c42] font-semibold hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Main Two-Column Layout (Filters + Bento Grid) */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full flex-1 items-start">
        <ExplorerFilters visible={mobileFiltersOpen} selectedCategories={selectedCategories}
          onCategory={handleCategoryToggle} stock={stockStatusFilter} onStock={setStockStatusFilter}
          warehouseId={selectedWarehouseId} onWarehouse={setSelectedWarehouseId} onClear={handleClearFilters} />

        {/* Results Area */}
        <section className="flex-1 flex flex-col gap-4 w-full">
          {/* Results Top Header */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-xs">
            <span className="text-xs sm:text-sm text-[#454651] px-1 sm:px-2">
              Mostrando <strong className="text-[#131b2e] font-bold">{filteredItems.length}</strong> componentes
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#eaedff] text-[#253685]'
                    : 'text-[#767682] hover:bg-[#f8fafc]'
                }`}
                title="Vista cuadrícula"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#eaedff] text-[#253685]'
                    : 'text-[#767682] hover:bg-[#f8fafc]'
                }`}
                title="Vista lista"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>

          {/* Results Layout */}
          <ExplorerResults items={visibleItems} mode={viewMode} />
          {pageCount > 1 && (
            <nav aria-label="Páginas del catálogo" className="flex items-center justify-center gap-3 py-3">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="px-3 py-2 rounded-lg border disabled:opacity-40">Anterior</button>
              <span className="text-sm text-[#454651]">Página {currentPage} de {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="px-3 py-2 rounded-lg border disabled:opacity-40">Siguiente</button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
};
