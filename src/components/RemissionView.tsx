import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInventory } from '../context/InventoryContext';
import { readRemisionesPage } from '../data/repository';
import { isDemo } from '../lib/supabase';
import { errorMessage } from '../shared/errors';
import { SearchInput } from './ui/SearchInput';
import { RemissionCard } from './remission/RemissionCard';

export const RemissionView: React.FC = () => {
  const { remisiones, openPdfRemision, openOutgoingPhotos, setActiveView, user } = useInventory();
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Remisiones de Entrega
          </h2>
          <p className="text-sm md:text-base text-[#454651]">
            Documentos oficiales de salida fotovoltaico y control de entrega en obra.
          </p>
        </div>

        {(isDemo || ['admin', 'operador'].includes(user.role)) && <button
          onClick={() => setActiveView('dispatch')}
          className="px-4 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-semibold hover:bg-[#323f80] active:scale-95 transition-all shadow-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nueva salida</span>
        </button>}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 mb-6 shadow-xs flex items-center gap-3">
        <span className="material-symbols-outlined text-[#767682] text-[20px] pl-2">search</span>
        <SearchInput
          type="text"
          value={searchQuery}
          aria-label="Buscar remisiones"
          onClear={() => setSearchQuery('')}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por código de remisión, proyecto o receptor..."
          className="w-full py-1 text-sm bg-transparent border-none focus:outline-hidden text-[#131b2e]"
        />
      </div>

      {/* Remissions Grid */}
      {cloudPage.isError && <p role="alert" className="text-sm text-red-700 mb-3">No se pudieron cargar las remisiones: {errorMessage(cloudPage.error)}</p>}
      {cloudPage.isPending && !isDemo && <p className="text-sm text-[#64748b] mb-3">Cargando remisiones…</p>}
      {total === 0 && (isDemo || !cloudPage.isPending) && <p className="text-sm text-[#64748b] mb-3">No hay remisiones para esta búsqueda.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleRemisiones.map(rem => <RemissionCard key={rem.id} remission={rem} onPdf={() => openPdfRemision(rem)} onPhotos={() => openOutgoingPhotos(rem.id)} />)}
      </div>
      {pages > 1 && <nav aria-label="Páginas de remisiones" className="flex items-center justify-center gap-3 py-5 text-sm">
        <button disabled={page === 1} onClick={() => setPageState({ key: filterKey, page: page - 1 })} className="px-3 py-2 border rounded-lg disabled:opacity-40">Anterior</button>
        <span>{page} / {pages}</span>
        <button disabled={page === pages} onClick={() => setPageState({ key: filterKey, page: page + 1 })} className="px-3 py-2 border rounded-lg disabled:opacity-40">Siguiente</button>
      </nav>}
    </div>
  );
};
