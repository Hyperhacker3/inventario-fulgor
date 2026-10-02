import { useMemo, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { categories } from '../../domain/catalogs';
import { available } from '../../domain/inventory';
import { ItemImage } from '../ItemImage';

export function AvailableInventory() {
  const { elementos, dispatchCart, addToDispatchCart, getLocationString, openItemDetail } = useInventory();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TODOS');
  const [page, setPage] = useState(1);
  const filterKey = `${search}|${category}`;
  const [pageKey, setPageKey] = useState('');
  const currentPage = pageKey === filterKey ? page : 1;
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return elementos.filter(item => available(item) > 0 && (category === 'TODOS' || item.categoria === category)
      && (!query || [item.codigo, item.nombre, getLocationString(item)].some(value => value.toLowerCase().includes(query))));
  }, [elementos, search, category, getLocationString]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const visible = filtered.slice((currentPage - 1) * 25, currentPage * 25);
  return <section className="lg:col-span-7 bg-white border rounded-2xl p-5 shadow-xs flex flex-col gap-4">
    <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Inventario disponible</h3>
      <span className="text-xs text-[#64748b]">{filtered.length} artículos en stock</span></div>
    <input id="dispatch-search-available" value={search} onChange={event => setSearch(event.target.value)}
      placeholder="Buscar por código, nombre o ubicación" aria-label="Buscar inventario para despacho"
      className="w-full p-2.5 rounded-lg border text-sm" />
    <div className="flex gap-2 overflow-x-auto pb-1">
      {['TODOS', ...categories].map(value => <button key={value} type="button" onClick={() => setCategory(value)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${category === value ? 'bg-[#3e4e9e] text-white' : 'bg-[#f8fafc] border'}`}>
        {value === 'TODOS' ? 'Todos' : value.replaceAll('_', ' ')}
      </button>)}
    </div>
    <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto">
      {visible.length === 0 && <p className="p-8 text-center text-sm text-[#64748b]">Sin componentes disponibles para esta búsqueda.</p>}
      {visible.map(item => <div key={item.id} className="border rounded-xl p-3 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${item.nombre}`} className="shrink-0 rounded-lg hover:opacity-80">
            <ItemImage source={item.fotoUrl} category={item.categoria} compact alt={item.nombre} className="w-12 h-12 rounded-lg object-cover" />
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
      <button disabled={currentPage === 1} onClick={() => { setPageKey(filterKey); setPage(currentPage - 1); }} className="px-3 py-1.5 border rounded disabled:opacity-40">Anterior</button>
      <span>{currentPage} / {pages}</span>
      <button disabled={currentPage >= pages} onClick={() => { setPageKey(filterKey); setPage(currentPage + 1); }} className="px-3 py-1.5 border rounded disabled:opacity-40">Siguiente</button>
    </nav>}
  </section>;
}
