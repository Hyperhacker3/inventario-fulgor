import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { TipoMovimiento, HistorialMovimiento } from '../types';

export const HistoryView: React.FC = () => {
  const {
    historial,
    remisiones,
    openPdfRemision,
    elementos,
    openItemDetail,
    globalSearch
  } = useInventory();

  // Filters State
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const effectiveSearch = (globalSearch || searchQuery).toLowerCase().trim();

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historial.filter((item) => {
      if (filterType !== 'TODOS' && item.tipo !== filterType) {
        return false;
      }

      if (effectiveSearch) {
        const matchCode = item.itemCode.toLowerCase().includes(effectiveSearch);
        const matchName = item.itemName.toLowerCase().includes(effectiveSearch);
        const matchProj = item.proyectoNombre?.toLowerCase().includes(effectiveSearch);
        const matchResp = item.responsable.toLowerCase().includes(effectiveSearch);
        const matchMotivo = item.motivo.toLowerCase().includes(effectiveSearch);
        if (!matchCode && !matchName && !matchProj && !matchResp && !matchMotivo) return false;
      }

      return true;
    });
  }, [historial, filterType, effectiveSearch]);

  // Paginated
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const paginatedItems = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Type badge helper
  const renderTypeBadge = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case 'SALIDA':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#fce8e6] text-[#c5221f] border border-[#ffdad6] flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">output</span>
            <span>Salida</span>
          </span>
        );
      case 'ENTRADA':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">input</span>
            <span>Entrada</span>
          </span>
        );
      case 'AJUSTE':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#fef7e0] text-[#755b00] border border-[#ffdf90] flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Ajuste</span>
          </span>
        );
      case 'REUBICACION':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#eaedff] text-[#253685] border border-[#cbd5e1] flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            <span>Reubicación</span>
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Tipo', 'Fecha', 'Hora', 'SKU', 'Componente', 'Proyecto', 'Cantidad', 'Unidad', 'Stock Nuevo', 'Responsable', 'Motivo'];
    const rows = filteredHistory.map((h) => [
      h.id,
      h.tipo,
      h.fecha,
      h.hora,
      h.itemCode,
      `"${h.itemName.replace(/"/g, '""')}"`,
      `"${(h.proyectoNombre || '').replace(/"/g, '""')}"`,
      h.cantidad,
      h.unidad,
      h.stockNuevo,
      `"${h.responsable.replace(/"/g, '""')}"`,
      `"${h.motivo.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_fulgor_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Top Header matching Mockup Image 5 */}
      <div className="mb-4 sm:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Historial de Movimientos y Remisiones
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#454651]">
            Trazabilidad completa de entradas, salidas y ajustes de inventario fotovoltaico.
          </p>
        </div>

        {/* Counter stat badge */}
        <div className="bg-white border border-[#e2e8f0] px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-2xs self-stretch sm:self-auto">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#eaedff] text-[#253685] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">timeline</span>
          </div>
          <div>
            <span className="text-[11px] text-[#767682] block leading-tight">Total Registros</span>
            <span className="font-bold text-xs sm:text-sm text-[#131b2e]">
              {historial.length} movimientos
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row matching mockup */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 sm:p-5 mb-4 sm:mb-6 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767682] text-[18px]">
              search
            </span>
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por SKU, Proyecto..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e2e8f0] text-xs sm:text-sm focus:ring-2 focus:ring-[#3e4e9e]"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            {/* Type Select */}
            <div className="relative flex-1 sm:min-w-[140px]">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white text-xs sm:text-sm py-2 pl-2.5 pr-7 focus:ring-2 focus:ring-[#3e4e9e] cursor-pointer truncate"
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="SALIDA">Salida</option>
                <option value="ENTRADA">Entrada</option>
                <option value="AJUSTE">Ajuste</option>
                <option value="REUBICACION">Reubicación</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#767682] text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Export button on mobile grid / desktop */}
            <button
              onClick={handleExportCSV}
              className="flex sm:hidden items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#131b2e] rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px] text-[#3e4e9e]">download</span>
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Action Button for larger screens */}
        <button
          onClick={handleExportCSV}
          className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#131b2e] rounded-lg text-sm font-semibold transition-colors shadow-2xs shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] text-[#3e4e9e]">download</span>
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-bold text-[#454651] uppercase tracking-wider">
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">Fecha & Hora</th>
                <th className="p-3.5">Código SKU</th>
                <th className="p-3.5">Componente</th>
                <th className="p-3.5">Proyecto / Destino</th>
                <th className="p-3.5 text-right">Cantidad</th>
                <th className="p-3.5 text-right">Stock Final</th>
                <th className="p-3.5">Responsable</th>
                <th className="p-3.5 text-center">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-[#767682]">
                    No se encontraron movimientos registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const matchingRemision = remisiones.find((r) => r.id === item.remisionId);
                  const matchingElemento = elementos.find((e) => e.id === item.elementoId);

                  return (
                    <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="p-3.5 whitespace-nowrap">{renderTypeBadge(item.tipo)}</td>
                      <td className="p-3.5 whitespace-nowrap text-xs text-[#454651]">
                        <div className="font-semibold text-[#131b2e]">{item.fecha}</div>
                        <div className="text-[11px] text-[#767682]">{item.hora}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          onClick={() => matchingElemento && openItemDetail(matchingElemento)}
                          className="font-mono-code font-bold text-xs text-[#3e4e9e] bg-[#eaedff] px-2 py-0.5 rounded cursor-pointer hover:underline"
                        >
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <p className="font-semibold text-xs text-[#131b2e] leading-snug truncate" title={item.itemName}>
                          {item.itemName}
                        </p>
                        <p className="text-[11px] text-[#767682] truncate">{item.motivo}</p>
                      </td>
                      <td className="p-3.5 text-xs text-[#454651] max-w-[180px]">
                        <span className="font-medium text-[#131b2e] truncate block">
                          {item.proyectoNombre || 'Bodega Central'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono-code font-bold whitespace-nowrap">
                        <span
                          className={
                            item.tipo === 'SALIDA'
                              ? 'text-[#c5221f]'
                              : item.tipo === 'ENTRADA'
                              ? 'text-[#137333]'
                              : 'text-[#755b00]'
                          }
                        >
                          {item.tipo === 'SALIDA' ? '-' : '+'}
                          {Math.abs(item.cantidad)} {item.unidad}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono-code text-xs text-[#454651] whitespace-nowrap">
                        {item.stockNuevo} {item.unidad}
                      </td>
                      <td className="p-3.5 text-xs text-[#454651] whitespace-nowrap">
                        {item.responsable}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {matchingRemision ? (
                          <button
                            onClick={() => openPdfRemision(matchingRemision)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eaedff] text-[#253685] hover:bg-[#3e4e9e] hover:text-white rounded-md text-xs font-semibold transition-all shadow-2xs"
                            title={`Ver Remisión ${matchingRemision.numeroRemision}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            <span>PDF</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[#cbd5e1]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-[#454651]">
            Mostrando {paginatedItems.length} de {filteredHistory.length} movimientos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#454651] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f3ff]"
            >
              Anterior
            </button>
            <span className="text-xs font-mono-code font-bold px-2 text-[#131b2e]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#454651] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f3ff]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
