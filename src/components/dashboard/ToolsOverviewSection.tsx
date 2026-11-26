import { useMemo, useState } from 'react';
import type { Categoria, Elemento } from '../../types';
import { ALL_LOCATIONS, emptyInventoryFilters, NO_LOCATION, type InventoryFilters } from '../../domain/explorer';
import { summarizeTools, type ToolScope } from '../../domain/toolsDashboard';
import { uppercaseName } from '../../shared/uppercase';
import { ItemImage } from '../ItemImage';
import { StateIcon } from '../ui/StateIcon';

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });

function formatRecentDate(item: Elemento) {
  const raw = item.updatedAt || item.createdAt;
  const parsed = raw ? Date.parse(raw) : NaN;
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  items: Elemento[];
  categories: readonly Categoria[];
  warehouseScope: string;
  getLocationString: (item: Elemento) => string;
  onOpenItem: (item: Elemento) => void;
  onOpenInventory: (filters: InventoryFilters) => void;
}

export function ToolsOverviewSection({ items, categories, warehouseScope, getLocationString, onOpenItem, onOpenInventory }: Props) {
  const [scope, setScope] = useState<ToolScope>('ALL');
  const summary = useMemo(() => summarizeTools(items, categories, scope, 3), [items, categories, scope]);
  const { selected, electric, combustion, categoryIds, recentForRepair } = summary;

  const openFiltered = (condition = 'todos', targetScope: ToolScope = scope) => {
    const ids = targetScope === 'ALL' ? categoryIds.all : targetScope === 'ELECTRICA' ? categoryIds.electric : categoryIds.combustion;
    const warehouseId = warehouseScope === 'ALL' ? ALL_LOCATIONS : warehouseScope === 'NONE' ? NO_LOCATION : warehouseScope;
    onOpenInventory({ ...emptyInventoryFilters(), categories: ids, condition, warehouseId });
  };

  const totalUnits = selected.units;
  const pct = (value: number) => totalUnits > 0 ? Math.max(0, (value / totalUnits) * 100) : 0;
  const segments = [
    { key: 'operativas', label: 'Operativas', units: selected.operationalUnits, refs: selected.operationalRefs, color: '#10b981', condition: 'BUENO' },
    { key: 'para-reparar', label: 'Para reparar', units: selected.forRepairUnits, refs: selected.forRepairRefs, color: '#f59e0b', condition: 'PARA REPARAR' },
    { key: 'en-reparacion', label: 'En reparación', units: selected.inRepairUnits, refs: selected.inRepairRefs, color: '#3e4e9e', condition: 'EN REPARACIÓN' },
    { key: 'malo', label: 'Malo', units: selected.badUnits, refs: selected.badRefs, color: '#dc2626', condition: 'MALO' },
  ];

  const tabs: { id: ToolScope; label: string; icon?: string; count: number }[] = [
    { id: 'ALL', label: 'Todas', count: summary.all.units },
    { id: 'ELECTRICA', label: 'Eléctricas', icon: 'electric_bolt', count: electric.units },
    { id: 'COMBUSTION', label: 'Combustión', icon: 'engineering', count: combustion.units },
  ];

  return (
    <section aria-labelledby="tools-dashboard-heading" className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Left: Interactive Tools KPIs & Health Breakdown */}
      <div className="xl:col-span-7 min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest text-[#3e4e9e] uppercase flex items-center gap-1.5">
              <StateIcon icon="build" className="text-base" />
              Parque de herramientas
            </p>
            <h3 id="tools-dashboard-heading" className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
              Eléctricas y a combustión
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {number.format(selected.units)} {selected.units === 1 ? 'unidad' : 'unidades'} en {number.format(selected.references)} {selected.references === 1 ? 'herramienta' : 'herramientas'}
            </p>
          </div>
          <div role="group" aria-label="Filtrar tipo de herramienta" className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={scope === tab.id}
                onClick={() => setScope(tab.id)}
                className="ui-flat-choice flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 min-h-11 rounded-xl text-[11px] sm:text-xs font-semibold min-w-0"
              >
                <span className="inline-flex items-center justify-center gap-1 min-w-0">
                  {tab.icon && <span className="material-symbols-outlined text-[15px] sm:text-[16px] shrink-0" aria-hidden="true">{tab.icon}</span>}
                  <span className="truncate">{tab.label}</span>
                </span>
                <span className="text-[10px] sm:text-[11px] opacity-75">({number.format(tab.count)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Interactive Status Tiles — 3 columns across mobile, tablet and desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => openFiltered('PARA REPARAR')}
            className="text-left p-2.5 sm:p-4 rounded-xl flex flex-col justify-between gap-2 min-h-[126px] sm:min-h-[116px] min-w-0"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-amber-700 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-1 leading-tight">
              <span className="break-words">Necesitan reparación</span>
              <StateIcon icon="build" className="text-base sm:text-lg shrink-0" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-amber-700 leading-none">
                {number.format(selected.forRepairUnits)}
                <span className="text-[10px] sm:text-xs font-semibold ml-1 opacity-80">und</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-tight break-words">
                {number.format(selected.forRepairRefs)} {selected.forRepairRefs === 1 ? 'herramienta' : 'herramientas'} · PARA REPARAR
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openFiltered('EN REPARACIÓN')}
            className="text-left p-2.5 sm:p-4 rounded-xl flex flex-col justify-between gap-2 min-h-[126px] sm:min-h-[116px] min-w-0"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[#3e4e9e] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-1 leading-tight">
              <span className="break-words">En reparación</span>
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] shrink-0" aria-hidden="true">engineering</span>
            </span>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-[#253685] leading-none">
                {number.format(selected.inRepairUnits)}
                <span className="text-[10px] sm:text-xs font-semibold ml-1 opacity-80">und</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-tight break-words">
                {number.format(selected.inRepairRefs)} en taller
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openFiltered('todos')}
            className="text-left p-2.5 sm:p-4 rounded-xl flex flex-col justify-between gap-2 min-h-[126px] sm:min-h-[116px] min-w-0"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-1 leading-tight">
              <span className="break-words">Operativas</span>
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] shrink-0" aria-hidden="true">check_circle</span>
            </span>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700 leading-none">
                {number.format(selected.operationalUnits)}
                <span className="text-[10px] sm:text-xs font-semibold ml-1 opacity-80">und</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-tight break-words">
                {selected.operationalPercent} % en buen estado
              </p>
            </div>
          </button>
        </div>

        {/* Interactive Split Comparison: Electric vs Combustion — 2 columns side by side */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {([
            { type: 'ELECTRICA' as const, title: 'Herramientas eléctricas', icon: 'electric_bolt', data: electric },
            { type: 'COMBUSTION' as const, title: 'Herramientas a combustión', icon: 'engineering', data: combustion },
          ]).map(group => {
            const active = scope === group.type;
            return (
              <button
                key={group.type}
                type="button"
                aria-pressed={active}
                onClick={() => setScope(active ? 'ALL' : group.type)}
                className="text-left p-3 sm:px-4 sm:py-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0"
              >
                <span className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true">{group.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[#131b2e] leading-snug break-words">{group.title}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {number.format(group.data.units)} und · {number.format(group.data.references)} ref.
                    </span>
                  </span>
                </span>
                <span className={`self-start sm:self-center shrink-0 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full ${group.data.forRepairUnits > 0 ? 'bg-[#fef7e0] text-[#755b00]' : 'bg-[#e6f4ea] text-[#137333]'}`}>
                  {number.format(group.data.forRepairUnits)} por reparar
                </span>
              </button>
            );
          })}
        </div>

        {/* Segmented Health Bar inside a carved neumorphic well */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-600">Estado del parque</span>
            <span className="text-slate-500">{selected.operationalPercent} % operativas</span>
          </div>
          <div aria-hidden="true" className="ui-inset h-3.5 w-full rounded-full overflow-hidden flex p-0.5 gap-0.5">
            {totalUnits > 0 ? segments.filter(seg => seg.units > 0).map(seg => (
              <div
                key={seg.key}
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct(seg.units)}%`, backgroundColor: seg.color }}
              />
            )) : <div className="h-full w-full rounded-full bg-slate-200/60" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
            {segments.map(seg => (
              <span key={seg.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span>{seg.label}: <strong className="text-[#131b2e]">{number.format(seg.units)}</strong></span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Latest 3 Tools Flagged for Repair */}
      <div className="xl:col-span-5 min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-[#131b2e] flex items-center gap-2">
              <StateIcon icon="build" className="text-xl text-amber-700" />
              <span>Últimas para reparación</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Las 3 herramientas más recientes en estado PARA REPARAR.
            </p>
          </div>
          {selected.forRepairRefs > 0 && (
            <button
              type="button"
              onClick={() => openFiltered('PARA REPARAR')}
              className="shrink-0 px-3 min-h-11 rounded-xl text-xs font-semibold text-[#3e4e9e]"
            >
              Ver todas ({number.format(selected.forRepairRefs)})
            </button>
          )}
        </div>

        {recentForRepair.length > 0 ? (
          <ol className="space-y-3 flex-1">
            {recentForRepair.map(({ item, type }) => {
              const dateLabel = formatRecentDate(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className="w-full text-left p-3 rounded-xl flex items-center gap-3 min-w-0"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#f8fafc] relative">
                      <ItemImage
                        source={item.fotoUrl}
                        category={item.categoria}
                        alt={item.nombre}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-code text-[11px] font-bold text-[#3e4e9e] truncate">{item.codigo}</span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fef7e0] text-[#755b00]">
                          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                            {type === 'ELECTRICA' ? 'electric_bolt' : 'engineering'}
                          </span>
                          {type === 'ELECTRICA' ? 'Eléctrica' : 'Combustión'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#131b2e] leading-snug line-clamp-2 break-words">
                        {uppercaseName(item.nombre)}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="truncate max-w-full">{getLocationString(item)}</span>
                        <span className="shrink-0 font-semibold text-amber-700">
                          {item.stockPendiente ? 'Conteo pendiente' : `${number.format(item.cantidad)} ${item.unidad}`}
                          {dateLabel ? ` · ${dateLabel}` : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="ui-inset flex-1 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <span className="material-symbols-outlined text-3xl text-emerald-700" aria-hidden="true">check_circle</span>
            <p className="text-sm font-semibold text-[#131b2e]">Todo al día</p>
            <p className="text-xs text-slate-500 max-w-xs">
              No hay herramientas {scope === 'ELECTRICA' ? 'eléctricas ' : scope === 'COMBUSTION' ? 'a combustión ' : ''}marcadas PARA REPARAR en este alcance.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
