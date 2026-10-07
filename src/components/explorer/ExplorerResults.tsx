import type { Elemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { ItemImage } from '../ItemImage';
import { isDemo } from '../../lib/supabase';
import { available } from '../../domain/inventory';
import { itemPhotos } from '../../domain/photos';
import { formatUnitWeight } from '../../domain/weight';
import type { MouseEvent } from 'react';

type ResultsInventory = Pick<ReturnType<typeof useInventory>, 'getLocationString' | 'openItemDetail' | 'addToDispatchCart' | 'user' | 'categoryLabel'>;

export function ExplorerResults({ items, mode }: { items: Elemento[]; mode: 'grid' | 'list' }) {
  const inventory = useInventory();
  return <ExplorerResultsContent items={items} mode={mode} inventory={inventory} />;
}

export function ExplorerResultsContent({ items, mode, inventory }: { items: Elemento[]; mode: 'grid' | 'list'; inventory: ResultsInventory }) {
  const { getLocationString, openItemDetail, addToDispatchCart, user, categoryLabel } = inventory;
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);
  const openSurface = (event: MouseEvent<HTMLElement>, item: Elemento) => {
    // Native actions keep their own behavior, including disabled cart buttons.
    if ((event.target as Element).closest('button, a, input, select, textarea, [role="button"]')) return;
    if (window.getSelection()?.isCollapsed === false) return;
    openItemDetail(item);
  };
  // Stock Badge renderer
  const renderStockBadge = (item: Elemento) => {
    if (item.cantidad === 0) {
      return (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#dd4c42] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#ffdad6]">
          <span className="w-2 h-2 rounded-full bg-[#dd4c42]"></span>
          <span>0 AGOTADO</span>
        </div>
      );
    }
    if (item.cantidad <= item.stockMinimo) {
      return (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#755b00] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#ffdf90]">
          <span className="w-2 h-2 rounded-full bg-[#f2c43a]"></span>
          <span>{item.cantidad} BAJO</span>
        </div>
      );
    }
    return (
      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[#10b981] text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-2xs border border-[#e6f4ea]">
        <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
        <span>{item.cantidad} DISP</span>
      </div>
    );
  };

  return (
    <>
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 sm:p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-[#767682] mb-3">search_off</span>
              <h3 className="font-bold text-base text-[#131b2e]">No se encontraron resultados</h3>
              <p className="text-xs text-[#454651] mt-1">Pruebe ajustando los filtros o el término de búsqueda.</p>
            </div>
          ) : mode === 'grid' ? (
            <div className="inventory-card-grid grid gap-4 sm:gap-5">
              {items.map((item) => {
                const photoCount = itemPhotos(item).length;

                return (
                  <article
                    key={item.id}
                    data-product-id={item.id}
                    onClick={event => openSurface(event, item)}
                    className="ui-product ui-product-card bg-white border border-[#e2e8f0] rounded-xl overflow-hidden flex flex-col"
                  >
                    {/* Image Area */}
                    <div
                      className="aspect-square w-full shrink-0 overflow-hidden bg-[#f8fafc] relative border-b border-[#e2e8f0] cursor-pointer"
                    >
                        <ItemImage
                          source={item.fotoUrl}
                          category={item.categoria}
                          alt={item.nombre}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      {renderStockBadge(item)}
                      {photoCount > 1 && <span className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-white/90 text-[#253685] text-xs font-semibold">{photoCount} fotos</span>}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-2">
                      <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                        <button type="button" className="ui-product-open block w-full text-left" onClick={() => openItemDetail(item)}
                          aria-label={`Ver detalles de ${item.codigo} · ${item.nombre}`} title={item.nombre}>{item.nombre}</button>
                      </h3>

                      {item.marca && <p className="text-xs text-slate-500 truncate">Marca: {item.marca}</p>}
                      <p className={`text-[11px] ${item.pesoUnitario ? 'text-slate-500' : 'text-amber-700'}`}>{formatUnitWeight(item.pesoUnitario)}{item.pesoUnitario ? ` / ${item.unidad}` : ''}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono-code text-xs font-semibold text-[#3e4e9e] bg-[#eaedff] px-2 py-0.5 rounded-md w-fit">
                          {item.codigo}
                        </span>
                        {(item.cantidadDanados || 0) > 0 && (
                          <span className="text-[10px] font-bold text-[#c5221f] bg-[#fce8e6] px-1.5 py-0.5 rounded border border-[#ffdad6]" title={`${item.cantidadDanados} unidades reportadas con daño`}>
                            {item.cantidadDanados} dañados
                          </span>
                        )}
                        {item.estado && item.estado !== 'BUENO' && (
                          <span className="text-[10px] font-semibold text-[#755b00] bg-[#fef7e0] px-1.5 py-0.5 rounded">
                            {item.estado}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-2 flex flex-col gap-1 text-[#454651] text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#767682] shrink-0">location_on</span>
                          <span className="truncate">
                            {getLocationString(item)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#767682] shrink-0">category</span>
                          <span>{categoryLabel(item.categoria)}</span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-2 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openItemDetail(item)}
                          className="flex-1 bg-transparent border border-[#3e4e9e] text-[#3e4e9e] text-xs font-bold py-1.5 rounded-lg hover:bg-[#f2f3ff] transition-colors"
                        >
                          Detalles
                        </button>
                        {canOperate && <button
                          type="button"
                          onClick={() => addToDispatchCart(item)}
                          disabled={available(item) === 0}
                          className={`flex-1 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                            available(item) > 0
                              ? 'bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-95'
                              : 'bg-[#e2e8f0] text-[#767682] cursor-not-allowed'
                          }`}
                          title={available(item) > 0 ? 'Agregar a la salida' : 'Sin stock disponible'}
                        >
                          <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        </button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-2xs">
              <div className="inventory-list-scroll overflow-x-auto p-3">
                <table className="inventory-list-table w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] sm:text-xs font-bold text-[#454651] uppercase tracking-wider">
                      <th className="p-2.5 sm:p-3">Código</th>
                      <th className="p-2.5 sm:p-3">Componente</th>
                      <th className="p-2.5 sm:p-3 hidden sm:table-cell">Categoría</th>
                      <th className="p-2.5 sm:p-3 hidden md:table-cell">Ubicación</th>
                      <th className="p-2.5 sm:p-3 text-right">Stock</th>
                      <th className="p-2.5 sm:p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} data-product-id={item.id} onClick={event => openSurface(event, item)} className="ui-product ui-product-row">
                        <td className="p-2.5 sm:p-3 font-mono-code font-bold text-[#3e4e9e] whitespace-nowrap">
                          {item.codigo}
                        </td>
                        <td className="p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="shrink-0">
                              <ItemImage
                                source={item.fotoUrl}
                                category={item.categoria}
                                compact
                                alt={item.nombre}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-[#e2e8f0] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="min-w-0">
                              <button type="button" onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${item.codigo} · ${item.nombre}`} title={item.nombre} className="ui-product-open block max-w-full text-left font-semibold leading-snug truncate">{item.nombre}</button>
                              {item.marca && <p className="text-xs text-slate-500 truncate">{item.marca}</p>}
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#767682]">
                                <span>{categoryLabel(item.categoria)}</span>
                                <span className={item.pesoUnitario ? 'text-slate-500' : 'text-amber-700'}>{formatUnitWeight(item.pesoUnitario)}{item.pesoUnitario ? ` / ${item.unidad}` : ''}</span>
                                {(item.cantidadDanados || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-[#c5221f] bg-[#fce8e6] px-1 py-0.2 rounded">
                                    {item.cantidadDanados} dañados
                                  </span>
                                )}
                                {item.estado && item.estado !== 'BUENO' && (
                                  <span className="text-[10px] font-semibold text-[#755b00] bg-[#fef7e0] px-1 py-0.2 rounded">
                                    {item.estado}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 sm:p-3 text-xs text-[#454651] hidden sm:table-cell">{categoryLabel(item.categoria)}</td>
                        <td className="p-2.5 sm:p-3 text-xs text-[#454651] hidden md:table-cell">{getLocationString(item)}</td>
                        <td className="p-2.5 sm:p-3 text-right font-mono-code font-bold whitespace-nowrap">
                          <span
                            className={
                              item.cantidad === 0
                                ? 'text-[#dd4c42]'
                                : item.cantidad <= item.stockMinimo
                                ? 'text-[#b06000]'
                                : 'text-[#10b981]'
                            }
                          >
                            {item.cantidad}
                          </span>{' '}
                          <span className="text-[10px] font-normal text-[#767682]">{item.unidad}</span>
                        </td>
                        <td className="p-2.5 sm:p-3 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => openItemDetail(item)}
                              type="button"
                              className="w-11 h-11 p-1 rounded-md text-[#3e4e9e] hover:bg-[#f2f3ff]"
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            {canOperate && <button
                              type="button"
                              onClick={() => addToDispatchCart(item)}
                              disabled={available(item) === 0}
                              className={`w-11 h-11 p-1 rounded-md ${
                                available(item) > 0
                                  ? 'text-[#dd4c42] hover:bg-[#ffdad6]/50'
                                  : 'text-[#cbd5e1] cursor-not-allowed'
                              }`}
                              title="Registrar salida"
                            >
                              <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                            </button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
    </>
  );
}
