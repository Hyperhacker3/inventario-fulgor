import { Presence } from './ui/Motion';
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ItemImage } from './ItemImage';
import { ItemRegistrationContent, type RegistrationInventory } from './ItemRegistrationForm';
import { isDemo } from '../lib/supabase';

export function EntryView() {
  const inventory = useInventory();
  return <EntryContent inventory={inventory} />;
}
export function EntryContent({ inventory }: { inventory: RegistrationInventory & Pick<ReturnType<typeof useInventory>, 'getLocationString' | 'openItemDetail' | 'syncStatus'> }) {
  const { elementos, user, getLocationString, openItemDetail, syncStatus } = inventory;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const query = search.trim().toLocaleLowerCase('es');
  const matches = query ? elementos.filter(item => !item.archived && `${item.codigo} ${item.nombre} ${item.marca || ''} ${getLocationString(item)}`.toLocaleLowerCase('es').includes(query)) : [];
  const pages = Math.max(1, Math.ceil(matches.length / 5));
  const currentPage = Math.min(page, pages);
  const item = elementos.find(value => value.id === selectedId && !value.archived);
  const canCreate = isDemo || user.role === 'admin';
  return <div className="p-4 md:p-8 max-w-[1000px] w-full mx-auto space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div><h2 className="text-2xl md:text-3xl font-bold">Entradas</h2><p className="mt-2 text-slate-600">{canCreate ? 'Busque un material para registrar su recepción o complete el formulario para crear uno nuevo.' : 'Busque un material para registrar su recepción.'} Cada entrada se guarda en el historial.</p></div>
    </header>
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <label className="block text-sm font-semibold">Buscar material<input autoComplete="off" autoCorrect="off" spellCheck={false} type="search" disabled={busy} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Código, nombre, marca o ubicación" className="block w-full mt-2 p-3 rounded-xl border" /></label>
      <Presence open={!!query}><div className="ui-panel-enter space-y-3">
        <p role="status" className="text-xs text-slate-600">{matches.length} resultado(s){syncStatus === 'syncing' ? ' · Actualizando inventario…' : ''}</p>
        <div className="space-y-2">{matches.slice((currentPage - 1) * 5, currentPage * 5).map(result => <div key={result.id} className="entry-result-row grid w-full items-center gap-3 p-3 text-left border rounded-xl">
          <button type="button" disabled={busy} onClick={() => openItemDetail(result)} aria-label={`Ver detalles de ${result.nombre}`} className="entry-result-photo shrink-0"><ItemImage compact source={result.fotoUrl} category={result.categoria} alt={result.nombre} className="w-12 h-12 rounded-lg" /></button>
          <span className="entry-result-info min-w-0"><button type="button" disabled={busy} onClick={() => openItemDetail(result)} className="block text-left text-sm break-words font-bold hover:underline">{result.nombre}</button><span className="text-xs text-slate-600">{result.marca && `${result.marca} · `}{result.codigo} · {result.stockPendiente ? 'Stock pendiente de verificar' : `${result.cantidad} ${result.unidad}`}</span></span>
          <button type="button" disabled={busy} onClick={() => { setSelectedId(result.id); setSearch(''); setPage(1); }} className="entry-result-select min-h-11 text-xs text-white bg-[#137333] rounded-lg px-3 py-2 disabled:opacity-50">Seleccionar</button>
        </div>)}</div>
        {!matches.length && <p className="text-sm">{syncStatus === 'syncing' ? 'Cargando inventario…' : 'No se encontraron materiales.'}</p>}
        {pages > 1 && <div className="flex items-center justify-center gap-4 text-sm"><button disabled={busy || currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="disabled:opacity-40">Anterior</button><span>{currentPage} / {pages}</span><button disabled={busy || currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="disabled:opacity-40">Siguiente</button></div>}
      </div></Presence>
    </section>
    {item && <button type="button" disabled={busy} onClick={() => setSelectedId('')} className="min-h-11 px-4 py-2 rounded-xl text-sm text-[#253685]">Quitar selección</button>}
    {item || canCreate ? <ItemRegistrationContent key={item?.id || 'registration'} item={item} inventory={inventory} onBusyChange={setBusy} />
      : <p className="text-sm text-slate-600">Busque y seleccione un material para registrar su entrada.</p>}
  </div>;
}
