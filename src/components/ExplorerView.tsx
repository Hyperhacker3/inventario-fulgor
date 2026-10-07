import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ALL_LOCATIONS, emptyInventoryFilters, changeWarehouse, changeRack, changeLevel, filterInventory, orderInventoryByActivity, type InventoryFilters } from '../domain/explorer';
import { ExplorerResults } from './explorer/ExplorerResults';
import { ExplorerFilters } from './explorer/ExplorerFilters';
import { useInventoryViewMode } from '../state/useInventoryViewMode';

export const ExplorerView: React.FC = () => {
  const {
    elementos, almacenes, estanterias, niveles, cajas, categoryOptions, categoryLabel, setGlobalSearch,
    getLocationString,
    globalSearch
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useInventoryViewMode();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState(emptyInventoryFilters);
  const effectiveSearch = globalSearch || searchQuery;
  const changeFilters = (next: InventoryFilters) => { setFilters(next); setPage(1); };
  const handleClearFilters = () => {
    changeFilters(emptyInventoryFilters());
    setSearchQuery(''); setGlobalSearch('');
  };
  const activeFiltersCount = Number(filters.categories.length > 0) + Number(filters.stock !== 'todos')
    + Number(filters.warehouseId !== ALL_LOCATIONS) + Number(filters.rackId !== ALL_LOCATIONS)
    + Number(filters.levelId !== ALL_LOCATIONS) + Number(filters.boxId !== ALL_LOCATIONS) + Number(!!effectiveSearch.trim());
  const filteredItems = useMemo(() => orderInventoryByActivity(filterInventory(elementos, filters, effectiveSearch, getLocationString)),
    [elementos, filters, effectiveSearch, getLocationString]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 24));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * 24, currentPage * 24);

  return (
    <div className="flex flex-col p-3 sm:p-4 lg:p-8 max-w-[1400px] mx-auto w-full gap-4 sm:gap-6">
      {/* Prominent Search Header Section (Matching Mockup Image 9) */}
      <div className="w-full bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xs">
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
          <input autoComplete="off" autoCorrect="off" spellCheck={false}
            id="explorer-prominent-search"
            aria-label="Buscar productos por código, nombre o atributos"
            type="text"
            value={effectiveSearch}
            onChange={(e) => { setSearchQuery(e.target.value); setGlobalSearch(''); setPage(1); }}
            placeholder="Buscar código (ej. PAN550) o nombre..."
            className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs sm:text-base text-[#131b2e] focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] focus:border-transparent focus:bg-white transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-[#e2e8f0]">
        <button
          aria-expanded={mobileFiltersOpen} aria-controls="inventory-filters"
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
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full flex-1 items-start">
        <ExplorerFilters visible={mobileFiltersOpen} filters={filters}
          warehouses={almacenes} racks={estanterias} levels={niveles} boxes={cajas} categories={categoryOptions} categoryLabel={categoryLabel}
          onCategories={categories => changeFilters({ ...filters, categories })}
          onStock={stock => changeFilters({ ...filters, stock })}
          onWarehouse={id => changeFilters(changeWarehouse(filters, id))}
          onRack={id => changeFilters(changeRack(filters, id))}
          onLevel={id => changeFilters(changeLevel(filters, id))}
          onBox={boxId => changeFilters({ ...filters, boxId })} onClear={handleClearFilters} />

        {/* Results Area */}
        <section className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          {/* Results Top Header */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-xs">
            <span className="text-xs sm:text-sm text-[#454651] px-1 sm:px-2">
              Mostrando <strong className="text-[#131b2e] font-bold">{filteredItems.length}</strong> componentes
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Vista cuadrícula"
                className="ui-flat-choice min-w-11 min-h-11 p-1.5 sm:p-2 rounded-lg"
                title="Vista cuadrícula"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Vista lista"
                className="ui-flat-choice min-w-11 min-h-11 p-1.5 sm:p-2 rounded-lg"
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
