import type { Elemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { ItemImage } from '../ItemImage';
import { isDemo } from '../../lib/supabase';
import { available } from '../../domain/inventory';

export function ExplorerResults({ items, mode }: { items: Elemento[]; mode: 'grid' | 'list' }) {
  const { getAlmacenById, getEstanteriaById, getLocationString, openItemDetail, addToDispatchCart, user } = useInventory();
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {items.map((item) => {
                const alm = getAlmacenById(item.almacenId);
                const est = getEstanteriaById(item.estanteriaId);

                return (
                  <article
                    key={item.id}
                    className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Image Area */}
                    <div
                      className="aspect-4/3 bg-[#f8fafc] relative border-b border-[#e2e8f0] cursor-pointer"
                      onClick={() => openItemDetail(item)}
                    >
                      {item.fotoUrl ? (
                        <ItemImage
                          source={item.fotoUrl}
                          alt={item.nombre}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8fafc] text-[#94a3b8]">
                          <span className="material-symbols-outlined text-[32px] text-[#cbd5e1]">solar_power</span>
                          <span className="text-[10px] font-mono-code font-bold mt-0.5 text-[#64748b]">{item.categoria}</span>
                        </div>
                      )}
                      {renderStockBadge(item)}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-2">
                      <h3
                        onClick={() => openItemDetail(item)}
                        className="font-bold text-sm sm:text-base text-[#131b2e] leading-snug line-clamp-1 hover:text-[#3e4e9e] cursor-pointer"
                        title={item.nombre}
                      >
                        {item.nombre}
                      </h3>

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
                            {alm?.nombre || 'Bodega'} • {est?.nombre || 'Estante'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#767682] shrink-0">category</span>
                          <span>{item.categoria}</span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-2 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                        <button
                          onClick={() => openItemDetail(item)}
                          className="flex-1 bg-transparent border border-[#3e4e9e] text-[#3e4e9e] text-xs font-bold py-1.5 rounded-lg hover:bg-[#f2f3ff] transition-colors"
                        >
                          Detalles
                        </button>
                        {canOperate && <button
                          onClick={() => addToDispatchCart(item, 1)}
                          disabled={available(item) === 0}
                          className={`flex-1 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                            available(item) > 0
                              ? 'bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-95'
                              : 'bg-[#e2e8f0] text-[#767682] cursor-not-allowed'
                          }`}
                          title={available(item) > 0 ? 'Agregar al despacho' : 'Sin stock disponible'}
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
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
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
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="p-2.5 sm:p-3 font-mono-code font-bold text-[#3e4e9e] whitespace-nowrap">
                          {item.codigo}
                        </td>
                        <td className="p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {item.fotoUrl ? (
                              <ItemImage
                                source={item.fotoUrl}
                                alt={item.nombre}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-[#e2e8f0] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0 text-[#94a3b8]">
                                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-[#131b2e] leading-snug truncate">{item.nombre}</p>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#767682]">
                                <span>{item.categoria}</span>
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
                        <td className="p-2.5 sm:p-3 text-xs text-[#454651] hidden sm:table-cell">{item.categoria}</td>
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
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openItemDetail(item)}
                              className="p-1 rounded-md text-[#3e4e9e] hover:bg-[#f2f3ff]"
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            {canOperate && <button
                              onClick={() => addToDispatchCart(item, 1)}
                              disabled={available(item) === 0}
                              className={`p-1 rounded-md ${
                                available(item) > 0
                                  ? 'text-[#dd4c42] hover:bg-[#ffdad6]/50'
                                  : 'text-[#cbd5e1] cursor-not-allowed'
                              }`}
                              title="Despachar"
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
