import type { StockStatus } from '../../domain/dashboard';

const colors: Record<StockStatus, string> = { Disponible: '#10b981', 'Stock bajo': '#d97706', 'Sin disponibilidad': '#dc2626', 'Pendiente de conteo': '#6366f1' };
const number = new Intl.NumberFormat('es-CO');
export function StockChart({ statuses, total }: { statuses: Record<StockStatus, number>; total: number }) {
  let position = 0;
  const segments = Object.entries(statuses).map(([label, value]) => {
    const start = position;
    position += total ? value / total * 100 : 0;
    return `${colors[label as StockStatus]} ${start}% ${position}%`;
  });
  return <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
    <h3 className="font-bold">Disponibilidad del catálogo</h3>
    <p className="text-xs text-slate-500 mt-1">Productos según stock utilizable y mínimo configurado.</p>
    <div className="flex flex-wrap items-center justify-center gap-7 mt-6">
      <div aria-hidden="true" className="w-40 h-40 rounded-full flex items-center justify-center shrink-0" style={{ background: total ? `conic-gradient(${segments.join(',')})` : '#e2e8f0' }}>
        <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center"><strong className="text-3xl">{number.format(total)}</strong><span className="text-xs text-slate-500">productos</span></div>
      </div>
      <ul className="space-y-3 flex-1 min-w-44">{Object.entries(statuses).map(([label, value]) => <li key={label} className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: colors[label as StockStatus] }} />{label}</span>
        <span className="font-semibold whitespace-nowrap">{number.format(value)} <span className="font-normal text-slate-500 text-xs">({total ? Math.round(value / total * 100) : 0} %)</span></span>
      </li>)}</ul>
    </div>
  </section>;
}
export function InventoryBars({ title, description, rows }: { title: string; description: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
    <h3 className="font-bold">{title}</h3><p className="text-xs text-slate-500 mt-1">{description}</p>
    <ul className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">{rows.map((row, index) => <li key={`${row.label}-${index}`}>
      <div className="flex justify-between gap-3 text-xs mb-1"><span>{row.label}</span><strong>{number.format(row.value)}</strong></div>
      <div aria-hidden="true" className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#3e4e9e] rounded-full" style={{ width: `${row.value / max * 100}%` }} /></div>
    </li>)}</ul>
    {rows.length === 0 && <p className="py-8 text-sm text-slate-500">Sin productos en este alcance.</p>}
  </section>;
}
