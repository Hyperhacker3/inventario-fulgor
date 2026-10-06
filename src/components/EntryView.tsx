import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ItemImage } from './ItemImage';
import { EntryForm } from './entry/EntryForm';

export function EntryView() {
  const { elementos, addStockMovement, user, getLocationString, openItemDetail, syncStatus } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const query = search.trim().toLocaleLowerCase('es');
  const matches = query ? elementos.filter(item => !item.archived && `${item.codigo} ${item.nombre} ${getLocationString(item)}`.toLocaleLowerCase('es').includes(query)) : [];
  const pages = Math.max(1, Math.ceil(matches.length / 5));
  const currentPage = Math.min(page, pages);
  const item = elementos.find(value => value.id === selectedId);
  return <div className="p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6">
    <div><h2 className="text-2xl md:text-3xl font-bold">Entradas</h2><p className="mt-2 text-slate-600">Registre la recepción de material para aumentar sus existencias. Cada entrada se guarda en el historial.</p></div>
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <label className="block text-sm font-semibold">Buscar material<input type="search" disabled={busy} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Código, nombre o ubicación" className="block w-full mt-2 p-3 rounded-xl border" /></label>
      {query && <>
        <p role="status" className="text-xs text-slate-600">{matches.length} resultado(s){syncStatus === 'syncing' ? ' · Actualizando inventario…' : ''}</p>
        <div className="space-y-2">{matches.slice((currentPage - 1) * 5, currentPage * 5).map(result => <div key={result.id} className="entry-result-row grid w-full items-center gap-3 p-3 text-left border rounded-xl">
          <button type="button" disabled={busy} onClick={() => openItemDetail(result)} aria-label={`Ver detalles de ${result.nombre}`} className="entry-result-photo shrink-0"><ItemImage compact source={result.fotoUrl} category={result.categoria} alt={result.nombre} className="w-12 h-12 rounded-lg" /></button>
          <span className="entry-result-info min-w-0"><button type="button" disabled={busy} onClick={() => openItemDetail(result)} className="block text-left text-sm break-words font-bold hover:underline">{result.nombre}</button><span className="text-xs text-slate-600">{result.codigo} · {result.stockPendiente ? 'Stock pendiente de verificar' : `${result.cantidad} ${result.unidad}`}</span></span>
          <button type="button" disabled={busy} onClick={() => { setSelectedId(result.id); setSearch(''); setPage(1); }} className="entry-result-select min-h-11 text-xs text-white bg-[#137333] rounded-lg px-3 py-2 disabled:opacity-50">Seleccionar</button>
        </div>)}</div>
        {!matches.length && <p className="text-sm">{syncStatus === 'syncing' ? 'Cargando inventario…' : 'No se encontraron materiales.'}</p>}
        {pages > 1 && <div className="flex items-center justify-center gap-4 text-sm"><button disabled={busy || currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="disabled:opacity-40">Anterior</button><span>{currentPage} / {pages}</span><button disabled={busy || currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="disabled:opacity-40">Siguiente</button></div>}
      </>}
    </section>
    <section className="bg-white border rounded-2xl p-5 space-y-5">
      <h3 className="text-lg font-bold">Datos de la entrada</h3>
      {item ? <>
        <div className="flex items-center gap-3"><button type="button" disabled={busy} onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${item.nombre}`} className="shrink-0"><ItemImage compact source={item.fotoUrl} category={item.categoria} alt={item.nombre} className="w-16 h-16 rounded-lg" /></button><div className="min-w-0 break-words"><button type="button" disabled={busy} onClick={() => openItemDetail(item)} className="text-left font-bold hover:underline">{item.nombre}</button><p className="text-xs text-slate-600 mt-1">{item.codigo} · {getLocationString(item)}</p></div></div>
        {item.stockPendiente && <p className="bg-amber-50 p-3 rounded-xl text-sm">Primero verifique el stock mediante un ajuste desde el detalle del producto.</p>}
        <EntryForm key={item.id} item={item} responsible={user.name} onSave={addStockMovement} onBusyChange={setBusy} />
      </> : <p className="text-sm text-slate-600">Busque y seleccione un material para registrar su entrada.</p>}
    </section>
  </div>;
}
