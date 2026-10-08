import { Presence } from '../ui/Motion';
import { SearchInput } from '../ui/SearchInput';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventory } from '../../context/InventoryContext';
import { finishImageCleanup, permanentlyDeleteArchivedItem, readArchivedItems, readImageCleanupJobs, restoreArchivedItem } from '../../data/archivedInventory';
import { ItemDetailModal } from '../ItemDetailModal';
import { ItemImage } from '../ItemImage';
import { errorMessage } from '../../shared/errors';
import type { Elemento } from '../../types';

export function ArchivedItems() {
  const { user } = useInventory();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Elemento | null>(null);
  const [message, setMessage] = useState('');
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const admin = user.role === 'admin';
  const key = ['fulgor', user.email, 'archived-items'];
  const cleanupKey = ['fulgor', user.email, 'image-cleanup'];
  const items = useQuery({ queryKey: [...key, page, search], queryFn: () => readArchivedItems(page, search), enabled: admin, staleTime: 30_000 });
  const jobs = useQuery({ queryKey: cleanupKey, queryFn: readImageCleanupJobs, enabled: admin, retry: false });
  const refresh = async () => { await Promise.allSettled([
    client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: cleanupKey }),
  ]); };
  const remove = async (item: Elemento) => {
    if (!item.archived) throw new Error('Solo se pueden eliminar elementos archivados.');
    const cleaned = await permanentlyDeleteArchivedItem(item.id);
    setSelected(null);
    setMessage(cleaned ? `${item.codigo} eliminado definitivamente.` : `${item.codigo} eliminado. Quedó pendiente retirar sus fotos; use Reintentar limpieza.`);
    if (items.data?.rows.length === 1 && page > 1) setPage(page - 1);
    await refresh();
  };
  const restore = async (item: Elemento) => {
    if (!admin || !item.archived) throw new Error('Solo administración puede desarchivar elementos archivados.');
    const restored = await restoreArchivedItem(item.id);
    client.setQueryData<Elemento[]>(['fulgor', user.email, 'elementos'], previous =>
      [restored, ...(previous || []).filter(value => value.id !== restored.id)]);
    client.setQueryData<{ rows: Elemento[]; total: number }>([...key, page, search], previous => previous?.rows.some(value => value.id === item.id)
      ? { ...previous, rows: previous.rows.filter(value => value.id !== item.id), total: Math.max(0, previous.total - 1) } : previous);
    setSelected(null);
    setMessage(`${item.codigo} desarchivado. Ya está disponible en el inventario activo.`);
    if (items.data?.rows.length === 1 && page > 1) setPage(page - 1);
    await Promise.allSettled([
      client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['fulgor', user.email, 'elementos'] }),
    ]);
  };
  const retryCleanup = async () => {
    if (cleanupBusy) return;
    setCleanupBusy(true);
    try {
      const results = await Promise.all((jobs.data || []).map(finishImageCleanup));
      setMessage(results.every(Boolean) ? 'Limpieza de fotos completada.' : 'Algunas fotos siguen pendientes. Compruebe la conexión y reintente.');
      await refresh();
    } catch (cause) { setMessage(errorMessage(cause)); }
    finally { setCleanupBusy(false); }
  };
  if (!admin) return <p>Solo administración puede consultar y eliminar elementos archivados.</p>;
  const pages = Math.max(1, Math.ceil((items.data?.total || 0) / 10));
  return <section className="space-y-4">
    <div><h3 className="text-xl font-bold">Elementos archivados</h3><p className="text-sm text-slate-600 mt-1">Abra un elemento para consultar su detalle, desarchivarlo o eliminarlo definitivamente. Las remisiones y el historial se conservan.</p></div>
    <div className="flex flex-col sm:flex-row gap-3"><SearchInput value={search} onClear={() => { setSearch(''); setPage(1); }} onChange={event => { setSearch(event.target.value); setPage(1); }} aria-label="Buscar elementos archivados" placeholder="Buscar por código o nombre" className="min-w-0 w-full p-3 rounded-xl border bg-white" /><button type="button" className="min-h-11 shrink-0 underline text-[#253685]" onClick={() => { void refresh(); }}>Actualizar</button></div>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm">{message}</p>}
    {jobs.isError && <p role="alert" className="text-amber-800 text-sm">La eliminación no está disponible. Revise la conexión y la configuración de la base de datos y pulse Actualizar.</p>}
    {!!jobs.data?.length && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">Hay fotos pendientes de retirar de {jobs.data.length} elemento(s) eliminado(s). <button type="button" disabled={cleanupBusy} onClick={() => { void retryCleanup(); }} className="underline font-semibold disabled:opacity-50">{cleanupBusy ? 'Limpiando…' : 'Reintentar limpieza'}</button></div>}
    {items.isPending ? <p role="status">Cargando archivados…</p> : items.isError ? <p role="alert">{errorMessage(items.error)}</p> : <>
      <p className="text-sm text-slate-600">{items.data?.total || 0} elemento(s) archivado(s)</p>
      <div className="space-y-2">{items.data?.rows.map(item => <button type="button" key={item.id} onClick={() => setSelected(item)} className="w-full bg-white border rounded-xl p-3 flex items-center gap-4 text-left hover:border-[#253685]">
        <ItemImage compact source={item.fotoUrl} category={item.categoria} alt={item.nombre} className="w-14 h-14 rounded-lg shrink-0" />
        <span className="min-w-0 flex-1"><strong className="block text-sm break-words">{item.nombre}</strong><span className="text-xs text-slate-600">{item.codigo} · {item.cantidad} {item.unidad}</span></span><span className="text-xs text-[#253685]">Ver detalle</span>
      </button>)}</div>
      {!items.data?.rows.length && <p>No se encontraron elementos archivados.</p>}
      {pages > 1 && <div className="flex justify-center items-center gap-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="border rounded-lg p-2 disabled:opacity-40">Anterior</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="border rounded-lg p-2 disabled:opacity-40">Siguiente</button></div>}
    </>}
    <Presence open={!!selected}>{selected && <ItemDetailModal key={selected.id} item={selected} onClose={() => setSelected(null)} onRestore={restore} onPermanentDelete={jobs.isSuccess ? remove : undefined} />}</Presence>
  </section>;
}
