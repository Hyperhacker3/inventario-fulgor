import { useMemo, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { available } from '../../domain/inventory';
import { ItemImage } from '../ItemImage';

export function AvailableInventory() {
  const { elementos, dispatchCart, addToDispatchCart, getLocationString, openItemDetail } = useInventory();
  const [search, setSearch] = useState('');
  const query = search.toLowerCase().trim();
  const [page, setPage] = useState(1);
  const [pageKey, setPageKey] = useState('');
  const filtered = useMemo(() => {
    if (!query) return [];
    return elementos.filter(item => available(item) > 0
      && [item.codigo, item.nombre, getLocationString(item)].some(value => value.toLowerCase().includes(query)));
  }, [elementos, query, getLocationString]);
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(pageKey === query ? page : 1, pages);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  return <section className="w-full bg-white border rounded-2xl p-4 shadow-xs">
    <div className="relative">
      <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-xl">search</span>
      <input id="dispatch-search-available" type="search" value={search} onChange={event => setSearch(event.target.value)}
        placeholder="Buscar material por código, nombre o ubicación" aria-label="Buscar inventario para salida"
        aria-controls={query ? 'dispatch-search-results' : undefined}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm" />
    </div>
    {query && <div id="dispatch-search-results" className="mt-3 space-y-3">
      <p role="status" className="text-xs text-slate-500">{filtered.length ? `${filtered.length} resultado(s) con stock disponible` : 'Sin componentes disponibles para esta búsqueda.'}</p>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
      {visible.map(item => <div key={item.id} className="border rounded-lg p-2.5 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${item.nombre}`} className="shrink-0 rounded-lg hover:opacity-80">
            <ItemImage source={item.fotoUrl} category={item.categoria} compact alt={item.nombre} className="w-10 h-10 rounded-lg object-cover" />
          </button>
          <div className="min-w-0"><button type="button" onClick={() => openItemDetail(item)} title={item.nombre} className="block max-w-full text-left font-bold text-sm truncate hover:text-[#3e4e9e] hover:underline">{item.nombre}</button>
            <span className="block text-xs text-[#64748b] truncate">{item.codigo} · {getLocationString(item)}</span></div>
        </div>
        <div className="text-right shrink-0"><span className="block text-xs">{available(item)} {item.unidad}</span>
          <button id={`btn-add-cart-${item.codigo}`} type="button" onClick={() => addToDispatchCart(item)}
            className="mt-1 px-3 py-1.5 bg-[#3e4e9e] text-white rounded-lg text-xs font-bold">
            {dispatchCart.some(line => line.elemento.id === item.id) ? 'Añadir otro' : 'Añadir'}
          </button></div>
      </div>)}
      </div>
    {pages > 1 && <nav className="flex justify-center items-center gap-3 text-xs" aria-label="Páginas de inventario disponible">
      <button disabled={currentPage === 1} onClick={() => { setPageKey(query); setPage(currentPage - 1); }} className="px-3 py-1.5 border rounded disabled:opacity-40">Anterior</button>
      <span>{currentPage} / {pages}</span>
      <button disabled={currentPage >= pages} onClick={() => { setPageKey(query); setPage(currentPage + 1); }} className="px-3 py-1.5 border rounded disabled:opacity-40">Siguiente</button>
    </nav>}
    </div>}
  </section>;
}
