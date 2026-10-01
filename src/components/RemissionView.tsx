import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInventory } from '../context/InventoryContext';
import { readRemisionesPage } from '../data/repository';
import { isDemo } from '../lib/supabase';
import { errorMessage } from '../shared/errors';

export const RemissionView: React.FC = () => {
  const { remisiones, openPdfRemision, setActiveView, user } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteSearch, setRemoteSearch] = useState('');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  useEffect(() => { const timer = setTimeout(() => setRemoteSearch(searchQuery.trim()), 250); return () => clearTimeout(timer); }, [searchQuery]);
  const filterKey = isDemo ? searchQuery : remoteSearch;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const pageSize = 24;
  const cloudPage = useQuery({ queryKey: ['fulgor', user.email, 'remissions-page', page, remoteSearch],
    queryFn: () => readRemisionesPage(page, pageSize, remoteSearch), enabled: !isDemo, staleTime: 30_000 });

  const filteredRemisiones = remisiones.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.numeroRemision.toLowerCase().includes(q) ||
      r.proyectoNombre.toLowerCase().includes(q) ||
      r.cliente.toLowerCase().includes(q) ||
      r.recibidoPor.toLowerCase().includes(q)
    );
  });
  const total = isDemo ? filteredRemisiones.length : cloudPage.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visibleRemisiones = isDemo ? filteredRemisiones.slice((page - 1) * pageSize, page * pageSize) : cloudPage.data?.rows ?? [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Remisiones de Entrega
          </h2>
          <p className="text-sm md:text-base text-[#454651]">
            Documentos oficiales de despacho fotovoltaico y control de entrega en obra.
          </p>
        </div>

        {(isDemo || ['admin', 'operador'].includes(user.role)) && <button
          onClick={() => setActiveView('dispatch')}
          className="px-4 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-semibold hover:bg-[#323f80] active:scale-95 transition-all shadow-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nuevo Despacho</span>
        </button>}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 mb-6 shadow-xs flex items-center gap-3">
        <span className="material-symbols-outlined text-[#767682] text-[20px] pl-2">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por número de remisión (ej. REM-2026-0042), proyecto o receptor..."
          className="w-full py-1 text-sm bg-transparent border-none focus:outline-hidden text-[#131b2e]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-[#767682] hover:text-[#131b2e]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Remissions Grid */}
      {cloudPage.isError && <p role="alert" className="text-sm text-red-700 mb-3">No se pudieron cargar las remisiones: {errorMessage(cloudPage.error)}</p>}
      {cloudPage.isPending && !isDemo && <p className="text-sm text-[#64748b] mb-3">Cargando remisiones…</p>}
      {total === 0 && (isDemo || !cloudPage.isPending) && <p className="text-sm text-[#64748b] mb-3">No hay remisiones para esta búsqueda.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleRemisiones.map((rem) => {
          const totalItems = rem.items.reduce((sum, i) => sum + i.cantidad, 0);

          return (
            <article
              key={rem.id}
              className="bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-[#cbd5e1] transition-all group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono-code font-bold text-xs bg-[#fce8e6] text-[#dd4c42] border border-[#ffdad6] px-2.5 py-1 rounded-lg">
                    {rem.numeroRemision}
                  </span>
                  <span className="text-xs text-[#767682] font-medium">{rem.fecha}</span>
                </div>

                <h3 className="font-bold text-base text-[#131b2e] leading-snug mb-1 group-hover:text-[#3e4e9e] transition-colors">
                  {rem.proyectoNombre}
                </h3>
                <p className="text-xs text-[#454651] mb-3">{rem.cliente}</p>

                {/* Items List Preview */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 mb-4 flex flex-col gap-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-[#767682] tracking-wider">
                    Componentes Despachados ({rem.items.length})
                  </span>
                  {rem.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[#454651]">
                      <span className="truncate pr-2">
                        {item.cantidad} {item.unidad} • {item.nombre}
                      </span>
                      <span className="font-mono-code text-[11px] font-bold text-[#3e4e9e] shrink-0">
                        {item.codigo}
                      </span>
                    </div>
                  ))}
                  {rem.items.length > 3 && (
                    <span className="text-[10px] text-[#767682] italic">
                      + {rem.items.length - 3} componente(s) más...
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-3">
                <div className="text-xs text-[#767682]">
                  Total: <strong className="text-[#131b2e] font-bold">{totalItems}</strong> unidades
                </div>
                <button
                  onClick={() => openPdfRemision(rem)}
                  className="px-3.5 py-2 bg-[#eaedff] text-[#253685] hover:bg-[#3e4e9e] hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Ver / Imprimir PDF</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {pages > 1 && <nav aria-label="Páginas de remisiones" className="flex items-center justify-center gap-3 py-5 text-sm">
        <button disabled={page === 1} onClick={() => setPageState({ key: filterKey, page: page - 1 })} className="px-3 py-2 border rounded-lg disabled:opacity-40">Anterior</button>
        <span>{page} / {pages}</span>
        <button disabled={page === pages} onClick={() => setPageState({ key: filterKey, page: page + 1 })} className="px-3 py-2 border rounded-lg disabled:opacity-40">Siguiente</button>
      </nav>}
    </div>
  );
};
