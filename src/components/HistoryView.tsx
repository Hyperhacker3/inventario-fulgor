import { Select } from './ui/Select';
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInventory } from '../context/InventoryContext';
import { isDemo } from '../lib/supabase';
import { readHistory, readRemisionById } from '../data/repository';
import { exportHistory } from './history/exportHistory';
import { HistoryTable } from './history/HistoryTable';
import { errorMessage } from '../shared/errors';

export const HistoryView: React.FC = () => {
  const {
    historial,
    remisiones,
    proyectos,
    openPdfRemision,
    globalSearch,
    user
  } = useInventory();

  // Filters State
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const [remoteSearch, setRemoteSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const itemsPerPage = 25;

  const effectiveSearch = (globalSearch || searchQuery).toLowerCase().trim();
  useEffect(() => {
    const timer = setTimeout(() => setRemoteSearch(effectiveSearch), 250);
    return () => clearTimeout(timer);
  }, [effectiveSearch]);
  const filterKey = `${filterType}|${isDemo ? effectiveSearch : remoteSearch}`;
  const currentPage = pageState.key === filterKey ? pageState.page : 1;
  const cloudPage = useQuery({
    queryKey: ['fulgor', user.email, 'history-page', currentPage, filterType, remoteSearch],
    queryFn: () => readHistory(currentPage, itemsPerPage, { type: filterType, search: remoteSearch }),
    enabled: !isDemo,
    staleTime: 30_000,
  });

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
  const totalResults = isDemo ? filteredHistory.length : cloudPage.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  const paginatedItems = isDemo ? filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) : cloudPage.data?.rows ?? [];

  const handleExportCSV = async () => {
    setExportError(''); setExporting(true);
    try { await exportHistory(filteredHistory, proyectos, filterType, remoteSearch); }
    catch (error) { setExportError(errorMessage(error)); }
    finally { setExporting(false); }
  };
  const openDocument = async (id: string) => {
    setDocumentError('');
    try {
      const cached = remisiones.find(remission => remission.id === id);
      if (cached) openPdfRemision(cached);
      else if (!isDemo) openPdfRemision(await readRemisionById(id));
      else throw new Error('No se encontró la remisión en los datos locales.');
    } catch (error) { setDocumentError(errorMessage(error)); }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full">
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
              {totalResults} movimientos
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
            <input autoComplete="off" autoCorrect="off" spellCheck={false}
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              placeholder="Buscar por SKU, Proyecto..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e2e8f0] text-xs sm:text-sm focus:ring-2 focus:ring-[#3e4e9e]"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            {/* Type Select */}
            <div className="relative flex-1 sm:min-w-[140px]">
              <Select
                aria-label="Tipo de movimiento"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                }}
                className="w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white text-xs sm:text-sm py-2 pl-2.5 pr-7 focus:ring-2 focus:ring-[#3e4e9e] cursor-pointer truncate"
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="SALIDA">Salida</option>
                <option value="ENTRADA">Entrada</option>
                <option value="AJUSTE">Ajuste</option>
                <option value="REUBICACION">Reubicación</option>
              </Select>
            </div>

            {/* Export button on mobile grid / desktop */}
            <button
              onClick={handleExportCSV}
              disabled={exporting}
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
          disabled={exporting}
          className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#131b2e] rounded-lg text-sm font-semibold transition-colors shadow-2xs shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] text-[#3e4e9e]">download</span>
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Data Table */}
      {exportError && <p role="alert" className="text-sm text-red-700 mb-2">{exportError}</p>}
      {documentError && <p role="alert" className="text-sm text-red-700 mb-2">{documentError}</p>}
      {cloudPage.isError && <p role="alert" className="text-sm text-red-700 mb-2">No se pudo cargar el historial: {errorMessage(cloudPage.error)}</p>}
      <HistoryTable
        rows={paginatedItems}
        total={totalResults}
        page={currentPage}
        pages={totalPages}
        loading={cloudPage.isPending && !isDemo}
        onPage={next => setPageState({ key: filterKey, page: next })}
        onDocument={id => { void openDocument(id); }}
      />
    </div>
  );
};
