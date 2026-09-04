import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Elemento, CategoriaElemento } from '../types';

export const ExplorerView: React.FC = () => {
  const {
    elementos,
    almacenes,
    getLocationString,
    getAlmacenById,
    getEstanteriaById,
    addToDispatchCart,
    openItemDetail,
    globalSearch
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters State
  const [selectedCategories, setSelectedCategories] = useState<Record<CategoriaElemento, boolean>>({
    PANELES: true,
    INVERSORES: true,
    ESTRUCTURAS: true,
    CABLES: true,
    CONECTORES: true,
    PROTECCIONES: true,
    BATERIAS: true,
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
      if (selectedWarehouseId !== 'ALL' && item.almacenId !== Number(selectedWarehouseId)) {
        return false;
      }

      return true;
    });
  }, [elementos, effectiveSearch, selectedCategories, stockStatusFilter, selectedWarehouseId, getLocationString]);

  // Stock Badge renderer
  const renderStockBadge = (item: Elemento) => {
    if (item.cantidad === 0) {
      return (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#dd4c42] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#ffdad6]">
          <span className="w-2 h-2 rounded-full bg-[#dd4c42]"></span>
          <span>0 AGOTADO</span>
        </div>
      );
    }
    if (item.cantidad <= item.stockMinimo) {
      return (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#755b00] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#ffdf90]">
          <span className="w-2 h-2 rounded-full bg-[#f2c43a]"></span>
          <span>{item.cantidad} BAJO</span>
        </div>
      );
    }
    return (
      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#10b981] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#e6f4ea]">
        <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
        <span>{item.cantidad} DISP</span>
      </div>
    );
  };

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
        {/* Left Filters Sidebar */}
        <aside className={`w-full md:w-64 shrink-0 flex flex-col gap-4 ${mobileFiltersOpen ? 'block' : 'hidden md:flex'}`}>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-sm sm:text-base text-[#131b2e]">Filtros</h3>
              <button
                id="btn-clear-filters"
                onClick={handleClearFilters}
                className="text-[#3e4e9e] text-xs font-semibold hover:underline"
              >
                Limpiar
              </button>
            </div>

            {/* Categoría */}
            <div className="mb-5 sm:mb-6">
              <h4 className="text-[11px] sm:text-xs font-bold tracking-wider text-[#454651] uppercase mb-2.5">
                CATEGORÍA
              </h4>
              <div className="grid grid-cols-2 md:flex md:flex-col gap-2">
                {[
                  { id: 'PANELES' as CategoriaElemento, label: 'Paneles' },
                  { id: 'INVERSORES' as CategoriaElemento, label: 'Inversores' },
                  { id: 'ESTRUCTURAS' as CategoriaElemento, label: 'Estructuras' },
                  { id: 'CABLES' as CategoriaElemento, label: 'Cables' },
                  { id: 'CONECTORES' as CategoriaElemento, label: 'Conectores' },
                  { id: 'PROTECCIONES' as CategoriaElemento, label: 'Protecciones' },
                  { id: 'BATERIAS' as CategoriaElemento, label: 'Baterías' },
                  { id: 'OTROS' as CategoriaElemento, label: 'Otros' },
                ].map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={!!selectedCategories[cat.id]}
                      onChange={() => handleCategoryToggle(cat.id)}
                      className="rounded border-[#cbd5e1] text-[#3e4e9e] focus:ring-[#3e4e9e] w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-[#131b2e] group-hover:text-[#3e4e9e] transition-colors truncate">
                      {cat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Estado Stock */}
            <div className="mb-5 sm:mb-6">
              <h4 className="text-[11px] sm:text-xs font-bold tracking-wider text-[#454651] uppercase mb-2.5">
                ESTADO STOCK
              </h4>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => setStockStatusFilter('todos')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    stockStatusFilter === 'todos'
                      ? 'bg-[#3e4e9e] text-white font-bold shadow-xs'
                      : 'border border-[#e2e8f0] bg-white text-[#454651] hover:bg-[#f2f3ff]'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStockStatusFilter('disponible')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    stockStatusFilter === 'disponible'
                      ? 'bg-[#10b981] text-white font-bold shadow-xs'
                      : 'border border-[#e6f4ea] bg-[#e6f4ea]/60 text-[#137333] hover:bg-[#e6f4ea]'
                  }`}
                >
                  Disponible
                </button>
                <button
                  onClick={() => setStockStatusFilter('bajo')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    stockStatusFilter === 'bajo'
                      ? 'bg-[#d1a618] text-white font-bold shadow-xs'
                      : 'border border-[#ffdf90] bg-[#fef7e0]/60 text-[#755b00] hover:bg-[#fef7e0]'
                  }`}
                >
                  Bajo
                </button>
                <button
                  onClick={() => setStockStatusFilter('agotado')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    stockStatusFilter === 'agotado'
                      ? 'bg-[#dd4c42] text-white font-bold shadow-xs'
                      : 'border border-[#ffdad6] bg-[#fce8e6]/60 text-[#ba1a1a] hover:bg-[#fce8e6]'
                  }`}
                >
                  Agotado
                </button>
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h4 className="text-[11px] sm:text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
                UBICACIÓN
              </h4>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs py-2 px-3 focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e] cursor-pointer"
              >
                <option value="ALL">Todas las Bodegas</option>
                {almacenes.map((alm) => (
                  <option key={alm.id} value={alm.id}>
                    {alm.nombre} ({alm.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

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
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 sm:p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-[#767682] mb-3">search_off</span>
              <h3 className="font-bold text-base text-[#131b2e]">No se encontraron resultados</h3>
              <p className="text-xs text-[#454651] mt-1">Pruebe ajustando los filtros o el término de búsqueda.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredItems.map((item) => {
                const alm = getAlmacenById(item.almacenId);
                const est = getEstanteriaById(item.estanteriaId);

                return (
                  <article
                    key={item.id}
                    className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Image Area */}
                    <div
                      className="aspect-4/3 bg-[#f8fafc] relative border-b border-[#e2e8f0] cursor-pointer"
                      onClick={() => openItemDetail(item)}
                    >
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nombre}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8fafc] text-[#94a3b8]">
                          <span className="material-symbols-outlined text-[32px] text-[#cbd5e1]">solar_power</span>
                          <span className="text-[10px] font-mono-code font-bold mt-0.5 text-[#64748b]">{item.categoria}</span>
                        </div>
                      )}
                      {renderStockBadge(item)}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-2">
                      <h3
                        onClick={() => openItemDetail(item)}
                        className="font-bold text-sm sm:text-base text-[#131b2e] leading-snug line-clamp-1 hover:text-[#3e4e9e] cursor-pointer"
                        title={item.nombre}
                      >
                        {item.nombre}
                      </h3>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono-code text-xs font-semibold text-[#3e4e9e] bg-[#eaedff] px-2 py-0.5 rounded-md w-fit">
                          {item.codigo}
                        </span>
                        {(item.cantidadDanados || 0) > 0 && (
                          <span className="text-[10px] font-bold text-[#c5221f] bg-[#fce8e6] px-1.5 py-0.5 rounded border border-[#ffdad6]" title={`${item.cantidadDanados} unidades reportadas con daño`}>
                            {item.cantidadDanados} dañados
                          </span>
                        )}
                        {item.estado && item.estado !== 'BUENO' && (
                          <span className="text-[10px] font-semibold text-[#755b00] bg-[#fef7e0] px-1.5 py-0.5 rounded">
                            {item.estado}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-2 flex flex-col gap-1 text-[#454651] text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#767682] shrink-0">location_on</span>
                          <span className="truncate">
                            {alm?.nombre || 'Bodega'} • {est?.nombre || 'Estante'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#767682] shrink-0">category</span>
                          <span>{item.categoria}</span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-2 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                        <button
                          onClick={() => openItemDetail(item)}
                          className="flex-1 bg-transparent border border-[#3e4e9e] text-[#3e4e9e] text-xs font-bold py-1.5 rounded-lg hover:bg-[#f2f3ff] transition-colors"
                        >
                          Detalles
                        </button>
                        <button
                          onClick={() => addToDispatchCart(item, 1)}
                          disabled={item.cantidad === 0}
                          className={`flex-1 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                            item.cantidad > 0
                              ? 'bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-95'
                              : 'bg-[#e2e8f0] text-[#767682] cursor-not-allowed'
                          }`}
                          title={item.cantidad > 0 ? 'Agregar al despacho' : 'Sin stock disponible'}
                        >
                          <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] sm:text-xs font-bold text-[#454651] uppercase tracking-wider">
                      <th className="p-2.5 sm:p-3">Código</th>
                      <th className="p-2.5 sm:p-3">Componente</th>
                      <th className="p-2.5 sm:p-3 hidden sm:table-cell">Categoría</th>
                      <th className="p-2.5 sm:p-3 hidden md:table-cell">Ubicación</th>
                      <th className="p-2.5 sm:p-3 text-right">Stock</th>
                      <th className="p-2.5 sm:p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="p-2.5 sm:p-3 font-mono-code font-bold text-[#3e4e9e] whitespace-nowrap">
                          {item.codigo}
                        </td>
                        <td className="p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {item.fotoUrl ? (
                              <img
                                src={item.fotoUrl}
                                alt={item.nombre}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-[#e2e8f0] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0 text-[#94a3b8]">
                                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-[#131b2e] leading-snug truncate">{item.nombre}</p>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#767682]">
                                <span>{item.categoria}</span>
                                {(item.cantidadDanados || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-[#c5221f] bg-[#fce8e6] px-1 py-0.2 rounded">
                                    {item.cantidadDanados} dañados
                                  </span>
                                )}
                                {item.estado && item.estado !== 'BUENO' && (
                                  <span className="text-[10px] font-semibold text-[#755b00] bg-[#fef7e0] px-1 py-0.2 rounded">
                                    {item.estado}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 sm:p-3 text-xs text-[#454651] hidden sm:table-cell">{item.categoria}</td>
                        <td className="p-2.5 sm:p-3 text-xs text-[#454651] hidden md:table-cell">{getLocationString(item)}</td>
                        <td className="p-2.5 sm:p-3 text-right font-mono-code font-bold whitespace-nowrap">
                          <span
                            className={
                              item.cantidad === 0
                                ? 'text-[#dd4c42]'
                                : item.cantidad <= item.stockMinimo
                                ? 'text-[#b06000]'
                                : 'text-[#10b981]'
                            }
                          >
                            {item.cantidad}
                          </span>{' '}
                          <span className="text-[10px] font-normal text-[#767682]">{item.unidad}</span>
                        </td>
                        <td className="p-2.5 sm:p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openItemDetail(item)}
                              className="p-1 rounded-md text-[#3e4e9e] hover:bg-[#f2f3ff]"
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button
                              onClick={() => addToDispatchCart(item, 1)}
                              disabled={item.cantidad === 0}
                              className={`p-1 rounded-md ${
                                item.cantidad > 0
                                  ? 'text-[#dd4c42] hover:bg-[#ffdad6]/50'
                                  : 'text-[#cbd5e1] cursor-not-allowed'
                              }`}
                              title="Despachar"
                            >
                              <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
