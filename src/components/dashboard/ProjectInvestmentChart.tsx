import { useMemo, useState } from 'react';
import type { Proyecto, ProjectSpending } from '../../types';
import { formatCOP, roundCOP } from '../../domain/money';

const PALETTE = ['#3e4e9e', '#087f8c', '#10b981', '#f59e0b', '#8b5aa6', '#64748b'];
const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

interface ProjectRow {
  project: Proyecto;
  totalCOP: number;
  salidas: number;
}

export function ProjectInvestmentChart({ projects, spending, loading, error, onRetry, onOpenProjects }: {
  projects: Proyecto[]; spending: ProjectSpending[]; loading: boolean; error: boolean; onRetry: () => void; onOpenProjects?: () => void;
}) {
  const [filter, setFilter] = useState<'withSpend' | 'active' | 'all'>('withSpend');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo<ProjectRow[]>(() => {
    const index = new Map(spending.map(row => [row.proyectoId, row]));
    return projects
      .map(project => ({
        project,
        totalCOP: roundCOP(index.get(project.id)?.totalCOP || 0),
        salidas: index.get(project.id)?.salidas || 0,
      }))
      .sort((a, b) => b.totalCOP - a.totalCOP || b.salidas - a.salidas || a.project.nombre.localeCompare(b.project.nombre));
  }, [projects, spending]);

  if (loading || error) {
    return (
      <section aria-labelledby="project-investment-heading" className="min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-widest text-[#3e4e9e] uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">folder_open</span>
            Inversión en proyectos
          </p>
          <h3 id="project-investment-heading" className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
            Inversión de material por proyecto
          </h3>
        </div>
        {error ? (
          <div role="alert" className="mt-1 text-sm text-red-700 space-y-2">
            <p>No se pudo consultar el gasto de los proyectos.</p>
            <button type="button" onClick={onRetry} className="px-4 min-h-11 rounded-xl text-xs font-semibold text-[#253685]">Reintentar</button>
          </div>
        ) : (
          <p role="status" className="mt-1 text-sm text-slate-500">Consultando los valores de las salidas…</p>
        )}
      </section>
    );
  }

  const withSpend = rows.filter(row => row.totalCOP > 0);
  const activeRows = rows.filter(row => row.project.estado === 'ACTIVO');
  const effectiveFilter = filter === 'withSpend' && withSpend.length > 0 ? 'withSpend'
    : filter === 'active' ? 'active' : 'all';
  const visible = effectiveFilter === 'withSpend' ? withSpend : effectiveFilter === 'active' ? activeRows : rows;

  const grandTotal = roundCOP(spending.reduce((sum, row) => sum + row.totalCOP, 0));
  const totalDispatches = spending.reduce((sum, row) => sum + row.salidas, 0);
  const max = Math.max(1, ...visible.map(row => row.totalCOP));
  const leader = rows[0];
  const colorFor = (index: number) => PALETTE[index % PALETTE.length];

  return (
    <section aria-labelledby="project-investment-heading" className="min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-widest text-[#3e4e9e] uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">folder_open</span>
            Inversión en proyectos
          </p>
          <h3 id="project-investment-heading" className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
            Inversión de material por proyecto
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Salidas confirmadas a su valor registrado; toque un proyecto para ver detalles.
          </p>
        </div>
        {rows.length > 0 && (
          <div role="group" aria-label="Filtrar proyectos" className="flex flex-wrap items-center gap-1.5">
            {withSpend.length > 0 && (
              <button
                type="button"
                aria-pressed={effectiveFilter === 'withSpend'}
                onClick={() => setFilter('withSpend')}
                className="ui-flat-choice px-3 min-h-11 rounded-xl text-xs font-semibold"
              >
                Con inversión ({withSpend.length})
              </button>
            )}
            <button
              type="button"
              aria-pressed={effectiveFilter === 'active'}
              onClick={() => setFilter('active')}
              className="ui-flat-choice px-3 min-h-11 rounded-xl text-xs font-semibold"
            >
              Activos ({activeRows.length})
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
          <p className="text-[11px] font-semibold text-slate-500">Inversión acumulada</p>
          <p className="text-lg sm:text-xl font-bold text-[#253685] break-words mt-1">{formatCOP(grandTotal)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalDispatches.toLocaleString('es-CO')} {totalDispatches === 1 ? 'salida confirmada' : 'salidas confirmadas'}
          </p>
        </div>
        <div className="ui-inset p-3.5 rounded-xl min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">Proyecto con mayor inversión</p>
          <p className="text-sm font-bold text-[#131b2e] truncate mt-1">{leader && leader.totalCOP > 0 ? leader.project.nombre : 'Sin salidas valoradas'}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {leader && grandTotal > 0 ? `${formatCOP(leader.totalCOP)} · ${number.format((leader.totalCOP / grandTotal) * 100)} % del total` : 'Incluye todos los almacenes y finalizados'}
          </p>
        </div>
      </div>

      {/* Segmented proportion bar */}
      {grandTotal > 0 && withSpend.length > 0 && (
        <div className="space-y-2">
          <div aria-hidden="true" className="ui-inset h-3 w-full rounded-full overflow-hidden flex p-0.5 gap-0.5">
            {withSpend.map((row, index) => (
              <div
                key={row.project.id}
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1.5, (row.totalCOP / grandTotal) * 100)}%`, backgroundColor: colorFor(index) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interactive project list */}
      {visible.length > 0 ? (
        <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {visible.map((row, index) => {
            const share = grandTotal > 0 ? (row.totalCOP / grandTotal) * 100 : 0;
            const barWidth = row.totalCOP > 0 ? Math.max(3, (row.totalCOP / max) * 100) : 0;
            const color = colorFor(index);
            const expanded = selectedId === row.project.id;
            return (
              <li key={row.project.id} className="space-y-2">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-pressed={expanded}
                  onClick={() => setSelectedId(expanded ? null : row.project.id)}
                  className="w-full text-left p-3 rounded-xl flex flex-col gap-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.totalCOP > 0 ? color : '#cbd5e1' }} />
                      <span className="text-sm font-bold text-[#131b2e] truncate">{row.project.nombre}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${row.project.estado === 'ACTIVO' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-slate-100 text-slate-600'}`}>
                        {row.project.estado === 'ACTIVO' ? 'Activo' : 'Finalizado'}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <strong className="text-sm font-bold text-[#253685]">{formatCOP(row.totalCOP)}</strong>
                      {grandTotal > 0 && row.totalCOP > 0 && (
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
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="truncate">{row.project.ubicacion || row.project.cliente || 'Sin ciudad registrada'}</span>
                    <span className="shrink-0 font-semibold">
                      {row.salidas.toLocaleString('es-CO')} {row.salidas === 1 ? 'salida' : 'salidas'}
                    </span>
                  </div>
                </button>
                {expanded && (
                  <div className="ui-inset p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-2 flex-1 min-w-0">
                      <div className="min-w-0">
                        <dt className="text-[11px] text-slate-500">Cliente</dt>
                        <dd className="font-semibold text-[#131b2e] break-words">{row.project.cliente || 'Sin cliente'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[11px] text-slate-500">Ciudad</dt>
                        <dd className="font-semibold text-[#131b2e] break-words">{row.project.ubicacion || 'Sin ciudad'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[11px] text-slate-500">Participación</dt>
                        <dd className="font-semibold text-[#253685]">{grandTotal > 0 ? `${number.format(share)} %` : '0 %'} ({row.salidas} {row.salidas === 1 ? 'salida' : 'salidas'})</dd>
                      </div>
                    </dl>
                    {onOpenProjects && (
                      <button
                        type="button"
                        onClick={onOpenProjects}
                        className="shrink-0 px-3 min-h-11 rounded-xl text-xs font-semibold text-[#3e4e9e]"
                      >
                        Ir a Proyectos
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ui-inset rounded-xl p-6 text-center text-sm text-slate-500">
          Sin proyectos en este filtro.
        </div>
      )}
    </section>
  );
}
