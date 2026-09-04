import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Elemento } from '../types';

export const DashboardView: React.FC = () => {
  const {
    elementos,
    almacenes,
    proyectos,
    getLocationString,
    addToDispatchCart,
    openItemDetail,
    openQuickMovement,
    setActiveView,
    globalSearch
  } = useInventory();

  const [localSearch, setLocalSearch] = useState('');
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nombre' | 'codigo' | 'stock-asc' | 'stock-desc'>('codigo');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

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
          if (item.almacenId !== Number(selectedAlmacen)) return false;
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

  // Stock status helper
  const getStockStatus = (item: Elemento) => {
    if (item.cantidad === 0) {
      return {
        type: 'out',
        bg: 'bg-[#fce8e6]',
        text: 'text-[#c5221f]',
        label: 'Agotado',
        barColor: 'bg-[#dd4c42]',
        percent: 0
      };
    }
    if (item.cantidad <= item.stockMinimo) {
      return {
        type: 'low',
        bg: 'bg-[#fef7e0]',
        text: 'text-[#b06000]',
        label: 'Bajo Stock',
        barColor: 'bg-[#f2c43a]',
        percent: Math.min(100, Math.max(15, (item.cantidad / (item.stockMinimo * 2)) * 100))
      };
    }
    return {
      type: 'normal',
      bg: 'bg-[#e6f4ea]',
      text: 'text-[#137333]',
      label: 'Disponible',
      barColor: 'bg-[#10b981]',
      percent: Math.min(100, (item.cantidad / (item.stockMinimo * 3)) * 100)
    };
  };

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

          <button
            id="btn-new-item-cta"
            onClick={() => setActiveView('new-item')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#3e4e9e] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#323f80] transition-colors shadow-2xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nuevo Item</span>
          </button>
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
          {filteredElementos.map((item) => {
            const status = getStockStatus(item);
            const locationStr = getLocationString(item);

            return (
              <article
                key={item.id}
                id={`inventory-card-${item.codigo}`}
                className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Photo & SKU Tag */}
                <div
                  className="aspect-4/3 bg-[#f2f3ff] relative border-b border-[#e2e8f0] overflow-hidden cursor-pointer"
                  onClick={() => openItemDetail(item)}
                >
                  {item.fotoUrl ? (
                    <img
                      src={item.fotoUrl}
                      alt={item.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8fafc] text-[#94a3b8]">
                      <span className="material-symbols-outlined text-[36px] text-[#cbd5e1] group-hover:scale-110 transition-transform duration-300">solar_power</span>
                      <span className="text-[10px] font-mono-code font-bold mt-1 text-[#64748b]">{item.categoria}</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-mono-code bg-white/95 backdrop-blur-xs border border-[#e2e8f0] text-[#131b2e] shadow-2xs font-bold tracking-wider">
                    {item.codigo}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div>
                    <h3
                      onClick={() => openItemDetail(item)}
                      className="text-base md:text-lg font-bold text-[#131b2e] leading-snug mb-1.5 hover:text-[#3e4e9e] transition-colors cursor-pointer line-clamp-1"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#454651]">
                      <span className="material-symbols-outlined text-[14px] shrink-0 text-[#767682]">
                        location_on
                      </span>
                      <span className="truncate" title={locationStr}>
                        {locationStr}
                      </span>
                    </div>
                  </div>

                  {/* Stock details & progress bar */}
                  <div className="mt-auto flex flex-col gap-2.5 pt-2">
                    <div className="flex justify-between items-center bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-wider text-[#454651] uppercase">
                          Stock Disponible
                        </span>
                      </div>
                      <span
                        className={`${status.bg} ${status.text} font-bold px-3 py-1 rounded text-xs text-center flex items-center justify-center gap-1 min-w-[85px]`}
                      >
                        {status.type === 'low' && (
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                        )}
                        <span>
                          {item.cantidad} <span className="text-[10px] font-normal">{item.unidad}</span>
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-[#eaedff] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`${status.barColor} h-1.5 rounded-full transition-all duration-300`}
                        style={{ width: `${status.percent}%` }}
                      ></div>
                    </div>

                    {/* Action buttons matching mockup */}
                    <div className="flex gap-2 pt-1">
                      <button
                        id={`btn-edit-${item.codigo}`}
                        onClick={() => openItemDetail(item)}
                        className="flex-1 bg-[#3e4e9e] text-white text-xs font-medium py-2 px-2 rounded-lg flex items-center justify-center gap-1 hover:bg-[#323f80] active:scale-95 transition-all shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Editar</span>
                      </button>
                      <button
                        id={`btn-dispatch-${item.codigo}`}
                        onClick={() => {
                          if (item.cantidad > 0) {
                            addToDispatchCart(item, 1);
                            setActiveView('dispatch');
                          } else {
                            openQuickMovement(item, 'ENTRADA');
                          }
                        }}
                        disabled={item.cantidad === 0}
                        className={`flex-1 text-white text-xs font-medium py-2 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs ${
                          item.cantidad > 0
                            ? 'bg-[#dd4c42] hover:bg-[#c5433a]'
                            : 'bg-[#cbd5e1] cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {item.cantidad > 0 ? 'output' : 'block'}
                        </span>
                        <span>{item.cantidad > 0 ? 'Salida' : 'Agotado'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
