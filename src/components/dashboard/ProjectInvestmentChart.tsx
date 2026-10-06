import type { Proyecto, ProjectSpending } from '../../types';
import { formatCOP, roundCOP } from '../../domain/money';
import { InventoryBars } from './InventoryCharts';

export function ProjectInvestmentChart({ projects, spending, loading, error, onRetry }: {
  projects: Proyecto[]; spending: ProjectSpending[]; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const index = new Map(spending.map(row => [row.proyectoId, row.totalCOP]));
  const rows = projects.map(project => ({ label: project.nombre, value: index.get(project.id) || 0 })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (loading || error) return <section className="bg-white border rounded-2xl p-5">
    <h3 className="font-bold">Inversión de material por proyecto</h3>
    {error ? <div role="alert" className="mt-3 text-sm text-red-700">No se pudo consultar el gasto de los proyectos.
      <button type="button" onClick={onRetry} className="block mt-2 min-h-11 text-[#253685] underline">Reintentar</button></div>
      : <p role="status" className="mt-3 text-sm text-slate-500">Consultando los valores de las salidas…</p>}
  </section>;
  return <InventoryBars title="Inversión de material por proyecto" formatValue={formatCOP} rows={rows}
    description={`Total: ${formatCOP(roundCOP(spending.reduce((sum, row) => sum + row.totalCOP, 0)))}. Todas las salidas confirmadas, a su valor registrado; incluye todos los almacenes y proyectos finalizados.`} />;
}
