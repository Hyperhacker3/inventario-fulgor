import { useMemo, useState } from 'react';
import type { Almacen, Elemento } from '../../types';
import { emptyInventoryFilters, NO_LOCATION, type InventoryFilters } from '../../domain/explorer';
import { conditionMarksAllDamaged } from '../../domain/itemCondition';
import { formatCOP, inventoryLocationValues, roundCOP } from '../../domain/money';

const PALETTE = ['#3e4e9e', '#087f8c', '#10b981', '#f59e0b', '#8b5aa6', '#64748b'];
const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

interface WarehouseRow {
  id: string;
  label: string;
  city: string;
  total: number;
  damaged: number;
  references: number;
}

interface Props {
  items: Elemento[];
  warehouses: Almacen[];
  warehouseScope: string;
  onOpenInventory: (filters: InventoryFilters) => void;
}

export function WarehouseValueChart({ items, warehouses, warehouseScope, onOpenInventory }: Props) {
  const rows = useMemo<WarehouseRow[]>(() => {
    const locationTotals = inventoryLocationValues(items).warehouses;
    const refCounts = new Map<string, number>();
    let unassignedTotal = 0, unassignedDamaged = 0, unassignedRefs = 0;
    for (const item of items) {
      if (item.archived) continue;
      if (!item.almacenId) {
        unassignedRefs++;
        if (!item.stockPendiente) {
          const val = roundCOP(item.cantidad * (item.valorUnitario || 0));
          unassignedTotal += val;
          if (conditionMarksAllDamaged(item.estado)) unassignedDamaged += val;
        }
      } else {
        refCounts.set(item.almacenId, (refCounts.get(item.almacenId) || 0) + 1);
      }
    }
    const list: WarehouseRow[] = warehouses
      .filter(row => warehouseScope === 'ALL' || row.id === warehouseScope)
      .map(row => {
        const val = locationTotals.get(row.id);
        return {
          id: row.id,
          label: row.nombre,
          city: row.ciudad || '',
          total: roundCOP(val?.total || 0),
          damaged: roundCOP(val?.damaged || 0),
          references: refCounts.get(row.id) || 0,
        };
      });
    if (unassignedRefs > 0 && (warehouseScope === 'ALL' || warehouseScope === 'NONE')) {
      list.push({
        id: '',
        label: 'Sin almacén asignado',
        city: '',
        total: roundCOP(unassignedTotal),
        damaged: roundCOP(unassignedDamaged),
        references: unassignedRefs,
      });
    }
    return list.sort((a, b) => b.total - a.total || b.references - a.references || a.label.localeCompare(b.label));
  }, [items, warehouses, warehouseScope]);

  const withValue = useMemo(() => rows.filter(row => row.total > 0), [rows]);
  const [filter, setFilter] = useState<'withValue' | 'all'>('withValue');
  const effectiveFilter = filter === 'withValue' && withValue.length > 0 ? 'withValue' : 'all';
  const visible = effectiveFilter === 'withValue' ? withValue : rows;

  const grandTotal = roundCOP(rows.reduce((sum, row) => sum + row.total, 0));
  const totalRefs = rows.reduce((sum, row) => sum + row.references, 0);
  const max = Math.max(1, ...visible.map(row => row.total));
  const leader = rows[0];
  const colorFor = (index: number) => PALETTE[index % PALETTE.length];

  const openWarehouse = (id: string) => {
    onOpenInventory({ ...emptyInventoryFilters(), warehouseId: id || NO_LOCATION });
  };

  return (
    <section aria-labelledby="warehouse-value-heading" className="min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-widest text-[#3e4e9e] uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warehouse</span>
            Distribución de valor
          </p>
          <h3 id="warehouse-value-heading" className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
            Valor por almacén
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Toque un almacén para abrir su inventario filtrado.
          </p>
        </div>
        {withValue.length > 0 && withValue.length < rows.length && (
          <div role="group" aria-label="Filtrar almacenes por valor" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-pressed={effectiveFilter === 'withValue'}
              onClick={() => setFilter('withValue')}
              className="ui-flat-choice px-3 min-h-11 rounded-xl text-xs font-semibold"
            >
              Con valor ({withValue.length})
            </button>
            <button
              type="button"
              aria-pressed={effectiveFilter === 'all'}
              onClick={() => setFilter('all')}
              className="ui-flat-choice px-3 min-h-11 rounded-xl text-xs font-semibold"
            >
              Todos ({rows.length})
            </button>
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="ui-inset p-3.5 rounded-xl min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">Valor total en almacenes</p>
          <p className="text-lg sm:text-xl font-bold text-[#253685] break-words mt-1">{formatCOP(grandTotal)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalRefs.toLocaleString('es-CO')} referencias en {rows.length} {rows.length === 1 ? 'ubicación' : 'ubicaciones'}
          </p>
        </div>
        <div className="ui-inset p-3.5 rounded-xl min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">Almacén con mayor valor</p>
          <p className="text-sm font-bold text-[#131b2e] truncate mt-1">{leader && leader.total > 0 ? leader.label : 'Sin valor registrado'}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {leader && grandTotal > 0 ? `${formatCOP(leader.total)} · ${number.format((leader.total / grandTotal) * 100)} % del total` : 'Registre precios unitarios para comparar'}
          </p>
        </div>
      </div>

      {/* Segmented proportion bar */}
      {grandTotal > 0 && (
        <div className="space-y-2">
          <div aria-hidden="true" className="ui-inset h-3 w-full rounded-full overflow-hidden flex p-0.5 gap-0.5">
            {withValue.map((row, index) => (
              <div
                key={row.id || 'unassigned'}
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1.5, (row.total / grandTotal) * 100)}%`, backgroundColor: colorFor(index) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interactive warehouse list */}
      {visible.length > 0 ? (
        <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {visible.map((row, index) => {
            const share = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
            const barWidth = row.total > 0 ? Math.max(3, (row.total / max) * 100) : 0;
            const color = colorFor(index);
            return (
              <li key={row.id || 'unassigned'}>
                <button
                  type="button"
                  onClick={() => openWarehouse(row.id)}
                  className="w-full text-left p-3 rounded-xl flex flex-col gap-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.total > 0 ? color : '#cbd5e1' }} />
                      <span className="text-sm font-bold text-[#131b2e] truncate">{row.label}</span>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {row.references.toLocaleString('es-CO')} ref.
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <strong className="text-sm font-bold text-[#253685]">{formatCOP(row.total)}</strong>
                      {grandTotal > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaedff] text-[#253685]">
                          {number.format(share)} %
                        </span>
                      )}
                    </span>
                  </div>
                  <div aria-hidden="true" className="ui-inset h-2 w-full rounded-full overflow-hidden">
                    {barWidth > 0 && (
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barWidth}%`, backgroundColor: color }} />
                    )}
                  </div>
                  {(row.city || row.damaged > 0) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{row.city || 'Abrir inventario del almacén'}</span>
                      {row.damaged > 0 && <span className="text-rose-600 font-semibold">{formatCOP(row.damaged)} con daño</span>}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ui-inset rounded-xl p-6 text-center text-sm text-slate-500">
          Sin almacenes en este alcance.
        </div>
      )}
    </section>
  );
}
