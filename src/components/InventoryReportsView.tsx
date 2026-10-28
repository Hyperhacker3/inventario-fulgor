import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInventory } from '../context/InventoryContext';
import { readInventoryReportSource } from '../data/inventoryReport';
import { buildInventoryReport, reportQuantity, selectReportItems, type InventoryReport, type ReportFilters } from '../domain/inventoryReport';
import { formatCOP } from '../domain/money';
import { formatUnitWeight } from '../domain/weight';
import { errorMessage } from '../shared/errors';
import { SearchInput } from './ui/SearchInput';
import { Select } from './ui/Select';
import { StateIcon } from './ui/StateIcon';
import { useMotionActive } from './ui/Motion';
import type { Almacen, Elemento } from '../types';

export function InventoryReportsView() {
  const { elementos, almacenes, reportItemIds, setReportItemIds, reportFilters, setReportFilters,
    getLocationString, categoryLabel, user, openInventoryReport } = useInventory();
  const client = useQueryClient();
  const generate = async (ids: string[]) => {
    try {
      const source = await readInventoryReportSource(ids);
      return buildInventoryReport(source.items, ids, source.locations, source.company, user.name, new Date(), categoryLabel);
    } catch (cause) {
      void client.invalidateQueries({ queryKey: ['fulgor', user.email, 'elementos'] });
      throw cause;
    }
  };
  return <InventoryReportsManager items={elementos} warehouses={almacenes} selectedIds={reportItemIds} onSelectionChange={setReportItemIds}
    filters={reportFilters} onFiltersChange={setReportFilters} categoryLabel={categoryLabel} locationLabel={getLocationString}
    onGenerate={generate} onOpen={openInventoryReport} />;
}

interface Props {
  items: Elemento[]; warehouses: Almacen[]; selectedIds: string[]; onSelectionChange: (ids: string[]) => void;
  filters: ReportFilters; onFiltersChange: (filters: ReportFilters) => void;
  categoryLabel: (category: string) => string; locationLabel: (item: Elemento) => string;
  onGenerate: (ids: string[]) => Promise<InventoryReport>; onOpen: (report: InventoryReport) => void;
}
const searchText = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const PAGE_SIZE = 24;

export function InventoryReportsManager({ items, warehouses, selectedIds, onSelectionChange, filters, onFiltersChange,
  categoryLabel, locationLabel, onGenerate, onOpen }: Props) {
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const generating = useRef(false), live = useRef(true);
  const active = useMotionActive();
  useEffect(() => { live.current = active; return () => { live.current = false; }; }, [active]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const availableItems = useMemo(() => items.filter(item => !item.archived), [items]);
  const availableIds = useMemo(() => new Set(availableItems.map(item => item.id)), [availableItems]);
  const missing = selectedIds.filter(id => !availableIds.has(id));
  const filtered = useMemo(() => {
    const query = searchText(filters.search.trim());
    return availableItems.filter(item => (!filters.category || item.categoria === filters.category)
      && (!filters.warehouse || (filters.warehouse === 'unassigned' ? !item.almacenId : item.almacenId === filters.warehouse))
      && (!filters.onlySelected || selected.has(item.id))
      && (!query || searchText(`${item.codigo} ${item.nombre} ${item.marca || ''}`).includes(query)))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }) || a.id.localeCompare(b.id));
  }, [availableItems, filters, selected]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), page = Math.min(Math.max(1, filters.page), pages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categories = [...new Set(availableItems.map(item => item.categoria))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const changeFilters = (patch: Partial<ReportFilters>) => onFiltersChange({ ...filters, page: 1, ...patch });
  const choose = (ids: string[], checked: boolean) => { setError(''); onSelectionChange(selectReportItems(selectedIds, ids, checked)); };
  const allResultsSelected = filtered.length > 0 && filtered.every(item => selected.has(item.id));
  const generate = async () => {
    if (generating.current || !active) return;
    if (!selectedIds.length) { setError('Seleccione al menos un producto.'); return; }
    if (missing.length) { setError('Quite de la selección los productos que ya no están disponibles.'); return; }
    generating.current = true; setPending(true); setError('');
    try { const report = await onGenerate([...selectedIds]); if (live.current) onOpen(report); }
    catch (cause) { if (live.current) setError(errorMessage(cause)); }
    finally { generating.current = false; if (live.current) setPending(false); }
  };
  return <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6" aria-busy={pending}>
    <div><h2 className="text-2xl md:text-3xl font-bold">Informes de inventario</h2>
      <p className="text-sm text-slate-600 mt-2">Seleccione los productos para consultar su stock total, peso, valor y ubicación en un PDF.</p>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <div className="rounded-2xl bg-white p-4 sm:p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm min-w-0">Buscar producto
            <SearchInput aria-label="Buscar productos para el informe" value={filters.search} onChange={event => changeFilters({ search: event.target.value })}
              onClear={() => changeFilters({ search: '' })} placeholder="Código, nombre o marca" className="w-full rounded-xl p-3 mt-1" />
          </label>
          <label className="text-sm min-w-0" htmlFor="report-category">Categoría
            <Select id="report-category" value={filters.category} onChange={event => changeFilters({ category: event.target.value })} className="w-full rounded-xl p-3 mt-1">
              <option value="">Todas las categorías</option>{categories.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}
            </Select>
          </label>
          <label className="text-sm min-w-0" htmlFor="report-warehouse">Almacén
            <Select id="report-warehouse" value={filters.warehouse} onChange={event => changeFilters({ warehouse: event.target.value })} className="w-full rounded-xl p-3 mt-1">
              <option value="">Todos los almacenes</option><option value="unassigned">Sin almacén asignado</option>
              {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 min-h-11 text-sm"><input type="checkbox" checked={filters.onlySelected}
            onChange={event => changeFilters({ onlySelected: event.target.checked })} />Ver solo seleccionados</label>
          <button type="button" disabled={!filtered.length} onClick={() => choose(filtered.map(item => item.id), !allResultsSelected)} className="rounded-xl px-4 min-h-11 text-sm text-[#3e4e9e]">
            {allResultsSelected ? 'Quitar resultados' : 'Seleccionar resultados'} ({filtered.length})
          </button>
          <button type="button" disabled={!selectedIds.length} onClick={() => { onSelectionChange([]); setError(''); }} className="rounded-xl px-4 min-h-11 text-sm text-red-700">Limpiar selección</button>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 sm:p-5 flex flex-wrap justify-between items-center gap-4">
        <div><p className="font-bold">{selectedIds.length} producto(s) seleccionado(s)</p>
          <p className="text-xs text-slate-600 mt-1">Las cantidades se agrupan por unidad. Los datos pendientes se indican en el informe.</p>
        </div>
        <button type="button" onClick={() => { void generate(); }} disabled={!selectedIds.length || !!missing.length} className="rounded-xl px-5 py-3 text-[#3e4e9e] font-bold min-h-11 inline-flex gap-2 items-center">
          <StateIcon icon="assessment" />{pending ? 'Preparando informe…' : 'Generar informe PDF'}
        </button>
      </div>
      {!!missing.length && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        {missing.length} producto(s) seleccionado(s) ya no están disponibles. <button type="button" className="min-h-11 px-3 rounded-lg" onClick={() => choose(missing, false)}>Quitar no disponibles</button>
      </div>}
      <p className="text-sm text-slate-600">{filtered.length} producto(s) encontrado(s). La selección se conserva al buscar y cambiar de página.</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(item => <li key={item.id} className="min-w-0 rounded-2xl bg-white p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <label className="shrink-0 min-w-11 min-h-11 grid place-items-center"><input type="checkbox" checked={selected.has(item.id)}
              aria-label={`Seleccionar ${item.codigo} ${item.nombre}`} onChange={event => choose([item.id], event.target.checked)} className="w-5 h-5" /></label>
            <div className="min-w-0"><span className="text-xs font-bold text-[#3e4e9e]">{item.codigo}</span><h3 className="font-bold text-sm break-words uppercase">{item.nombre}</h3>
              {item.marca && <p className="text-xs text-slate-500 break-words">{item.marca}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-slate-500">Stock total</dt><dd className="font-bold">{item.stockPendiente ? 'Pendiente de verificar' : `${reportQuantity(item.cantidad)} ${item.unidad.toUpperCase()}`}</dd></div>
            <div><dt className="text-slate-500">Peso por unidad</dt><dd>{formatUnitWeight(item.pesoUnitario)}</dd></div>
            <div><dt className="text-slate-500">Valor por unidad</dt><dd>{formatCOP(item.valorUnitario || 0)}</dd></div>
            <div><dt className="text-slate-500">Condición</dt><dd>{item.estado || 'Sin especificar'}</dd></div>
            <div className="col-span-2 min-w-0"><dt className="text-slate-500">Ubicación</dt><dd className="break-words">{locationLabel(item)}</dd></div>
          </dl>
        </li>)}
      </ul>
      {!filtered.length && <p className="p-6 rounded-xl bg-white text-slate-600">No hay productos que coincidan con los filtros.</p>}
      <nav aria-label="Páginas del informe" className="flex flex-wrap justify-center items-center gap-4">
        <button type="button" disabled={page <= 1} onClick={() => changeFilters({ page: page - 1 })} className="rounded-xl min-h-11 px-4 text-sm">Anterior</button>
        <span className="text-sm">Página {page} de {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => changeFilters({ page: page + 1 })} className="rounded-xl min-h-11 px-4 text-sm">Siguiente</button>
      </nav>
    </fieldset>
  </div>;
}
