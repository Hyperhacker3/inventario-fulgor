import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ALL_LOCATIONS, emptyInventoryFilters, changeWarehouse, changeRack, changeLevel, filterInventory, orderInventoryByActivity, type InventoryFilters } from '../domain/explorer';
import { ExplorerResults } from './explorer/ExplorerResults';
import { ExplorerFilters } from './explorer/ExplorerFilters';
import { useInventoryViewMode } from '../state/useInventoryViewMode';
import { StateIcon } from './ui/StateIcon';
import { SearchInput } from './ui/SearchInput';

export const ExplorerView: React.FC = () => {
  const {
    elementos, almacenes, estanterias, niveles, cajas, categoryOptions, categoryLabel, setGlobalSearch,
    getLocationString,
    globalSearch
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useInventoryViewMode();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState(emptyInventoryFilters);
  const effectiveSearch = globalSearch || searchQuery;
  const changeFilters = (next: InventoryFilters) => { setFilters(next); setPage(1); };
  const handleClearFilters = () => {
    changeFilters(emptyInventoryFilters());
    setSearchQuery(''); setGlobalSearch('');
  };
  const activeFiltersCount = Number(filters.categories.length > 0) + Number(filters.stock !== 'todos')
    + Number(filters.condition !== 'todos')
    + Number(filters.warehouseId !== ALL_LOCATIONS) + Number(filters.rackId !== ALL_LOCATIONS)
    + Number(filters.levelId !== ALL_LOCATIONS) + Number(filters.boxId !== ALL_LOCATIONS) + Number(!!effectiveSearch.trim());
  const filteredItems = useMemo(() => orderInventoryByActivity(filterInventory(elementos, filters, effectiveSearch, getLocationString)),
    [elementos, filters, effectiveSearch, getLocationString]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 24));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * 24, currentPage * 24);

  return (
    <div className="flex flex-col p-3 sm:p-4 lg:p-8 w-full min-w-0 gap-4 sm:gap-6">
      {/* Search, result count and view controls share one responsive toolbar. */}
      <section aria-labelledby="inventory-explorer-heading" className="w-full min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-6 shadow-xs">
        <h2 id="inventory-explorer-heading" className="text-xl sm:text-2xl md:text-3xl font-bold text-[#131b2e] mb-1 tracking-tight">
          Explorador de Componentes
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-[#454651] mb-4 sm:mb-6">
          Encuentre rápidamente inventario fotovoltaico por código, nombre o atributos específicos.
        </p>

        <div className="inventory-toolbar grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:gap-4">
          <div className="relative min-w-0 col-span-2 lg:col-span-1 flex items-center">
            <div className="absolute inset-y-0 left-0 z-10 pl-3.5 flex items-center pointer-events-none text-[#767682]">
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]" aria-hidden="true">search</span>
            </div>
            <SearchInput
              id="explorer-prominent-search"
              aria-label="Buscar productos por código, nombre o atributos"
              type="text"
              value={effectiveSearch}
              onClear={() => { setSearchQuery(''); setGlobalSearch(''); setPage(1); }}
              onChange={(e) => { setSearchQuery(e.target.value); setGlobalSearch(''); setPage(1); }}
              placeholder="Buscar código (ej. PAN550) o nombre..."
              className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs sm:text-base text-[#131b2e] focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] focus:border-transparent focus:bg-white transition-all shadow-inner"
            />
          </div>
          <p role="status" className="min-w-0 text-xs sm:text-sm text-[#454651]">
            Mostrando <strong className="text-[#131b2e] font-bold">{filteredItems.length.toLocaleString('es-CO')}</strong> componentes
          </p>
          <div role="group" aria-label="Controles del inventario" className="flex items-center gap-1">
            <button type="button" aria-expanded={filtersOpen} aria-controls="inventory-filters" aria-pressed={filtersOpen}
              aria-label={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'} title={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              onClick={() => setFiltersOpen(open => !open)} className="ui-flat-choice relative min-w-11 min-h-11 p-2 rounded-lg">
              <StateIcon icon="filter_list" filled={filtersOpen} className="text-xl" />
              {activeFiltersCount > 0 && <span aria-hidden="true" className="absolute -top-1 -right-1 bg-[#3e4e9e] text-white text-[10px] px-1.5 rounded-full">{activeFiltersCount}</span>}
            </button>
            <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Vista cuadrícula"
              className="ui-flat-choice min-w-11 min-h-11 p-2 rounded-lg" title="Vista cuadrícula">
              <StateIcon icon="grid_view" filled={viewMode === 'grid'} className="text-xl" />
            </button>
            <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="Vista lista"
              className="ui-flat-choice min-w-11 min-h-11 p-2 rounded-lg" title="Vista lista">
              <StateIcon icon="view_list" filled={viewMode === 'list'} className="text-xl" />
            </button>
          </div>
        </div>
      </section>

      {/* Filters stay above both full-width result layouts. */}
      <div className={`flex flex-col w-full min-w-0 ${filtersOpen ? 'gap-4 sm:gap-6' : ''}`}>
        <ExplorerFilters visible={filtersOpen} filters={filters}
          warehouses={almacenes} racks={estanterias} levels={niveles} boxes={cajas} categories={categoryOptions} categoryLabel={categoryLabel}
          onCategories={categories => changeFilters({ ...filters, categories })}
          onStock={stock => changeFilters({ ...filters, stock })}
          onCondition={condition => changeFilters({ ...filters, condition })}
          onWarehouse={id => changeFilters(changeWarehouse(filters, id))}
          onRack={id => changeFilters(changeRack(filters, id))}
          onLevel={id => changeFilters(changeLevel(filters, id))}
          onBox={boxId => changeFilters({ ...filters, boxId })} onClear={handleClearFilters} />

        {/* Results Area */}
        <section aria-label="Componentes del inventario" className="min-w-0 flex flex-col gap-4 w-full">
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
