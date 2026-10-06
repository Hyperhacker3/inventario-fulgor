import { Select } from './ui/Select';
import { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { summarizeInventory, stockStatus } from '../domain/dashboard';
import { available } from '../domain/inventory';
import { InventoryBars, StockChart } from './dashboard/InventoryCharts';

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });
export function DashboardView() {
  const { elementos, almacenes, historial, setActiveView, openItemDetail, getLocationString, syncStatus, categoryLabel } = useInventory();
  const [warehouse, setWarehouse] = useState('ALL');
  const items = useMemo(() => elementos.filter(item => warehouse === 'ALL' || (warehouse === 'NONE' ? !item.almacenId : item.almacenId === warehouse)), [elementos, warehouse]);
  const summary = useMemo(() => summarizeInventory(items, almacenes), [items, almacenes]);
  const itemIndex = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);
  const recent = historial.filter(row => warehouse === 'ALL' || itemIndex.has(row.elementoId)).slice(0, 6);
  const metrics = [
    { label: 'Productos activos', value: summary.total, hint: 'Referencias distintas del catálogo', color: 'text-[#253685]' },
    { label: 'Sin disponibilidad', value: summary.statuses['Sin disponibilidad'], hint: 'Sin stock utilizable para registrar una salida', color: 'text-red-600' },
    { label: 'Stock bajo', value: summary.statuses['Stock bajo'], hint: 'Disponibilidad igual o inferior al mínimo', color: 'text-amber-600' },
    { label: 'Conteos pendientes', value: summary.statuses['Pendiente de conteo'], hint: 'Requieren confirmar existencias', color: 'text-indigo-600' },
    { label: 'Productos con daños', value: summary.damagedProducts, hint: 'Tienen material marcado como dañado', color: 'text-rose-600' },
  ];
  return <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
    <div className="flex flex-wrap justify-between items-end gap-4">
      <div><p className="text-xs font-bold tracking-widest text-[#3e4e9e] uppercase mb-1">EL TURPIAL · Control de inventario</p>
        <h2 className="text-2xl md:text-3xl font-bold">Panel de inventario</h2><p className="text-sm text-slate-500 mt-1">Disponibilidad, distribución y prioridades del inventario actual.</p></div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-slate-500">Alcance<Select value={warehouse} onChange={event => setWarehouse(event.target.value)} className="block mt-1 border rounded-lg p-2 text-sm bg-white text-slate-800">
          <option value="ALL">Todos los almacenes</option>{almacenes.map(row => <option key={row.id} value={row.id}>{row.nombre}</option>)}<option value="NONE">Sin almacén</option>
        </Select></label>
        <button type="button" onClick={() => setActiveView('explorer')} className="px-4 py-2.5 text-sm font-bold rounded-lg bg-[#3e4e9e] text-white">Ver inventario</button>
      </div>
    </div>
    {syncStatus === 'offline' && <p role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">No se pudo confirmar la sincronización. Los datos mostrados corresponden a la última lectura disponible.</p>}
    {elementos.length === 0 && syncStatus === 'syncing' ? <p role="status" className="p-8 bg-white rounded-xl">Cargando indicadores…</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{metrics.map(metric => <section key={metric.label} className="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-600">{metric.label}</h3><p className={`text-3xl font-bold mt-2 ${metric.color}`}>{number.format(metric.value)}</p><p className="text-[11px] text-slate-500 mt-2">{metric.hint}</p>
      </section>)}</div>
      <div className="grid lg:grid-cols-2 gap-5"><StockChart statuses={summary.statuses} total={summary.total} /><InventoryBars title="Productos por categoría" description="Cantidad de referencias distintas, independientemente de sus unidades." rows={summary.categories.map(row => ({ ...row, label: categoryLabel(row.id) }))} /></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <InventoryBars title="Distribución por almacén" description="Productos asignados a cada almacén dentro del alcance seleccionado." rows={summary.warehouses} />
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <h3 className="font-bold">Existencias por unidad de medida</h3><p className="text-xs text-slate-500 mt-1">Cantidades confirmadas. Se excluyen los conteos pendientes.</p>
          <div className="overflow-x-auto mt-4"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500"><tr><th className="py-2">Unidad</th><th className="text-right">Registrado</th><th className="text-right">Disponible</th><th className="text-right">Dañado</th></tr></thead><tbody>
            {summary.units.map(row => <tr key={row.unit} className="border-t border-slate-100"><th className="py-3 uppercase">{row.unit}</th><td className="text-right">{number.format(row.recorded)}</td><td className="text-right font-semibold text-emerald-700">{number.format(row.available)}</td><td className="text-right">{number.format(row.damaged)}</td></tr>)}
          </tbody></table></div>
          {summary.units.length === 0 && <p className="py-6 text-sm text-slate-500">No hay existencias confirmadas en este alcance.</p>}
          <p className="text-xs text-slate-500 mt-4">Cada unidad se calcula por separado: metros, kilos y unidades no se suman entre sí.</p>
        </section>
      </div>
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
        <div className="flex justify-between gap-3 items-center"><h3 className="font-bold">Prioridades de stock <span className="text-slate-500 text-sm">({summary.alerts.length})</span></h3><button type="button" onClick={() => setActiveView('explorer')} className="text-xs text-[#3e4e9e] font-bold hover:underline">Consultar catálogo</button></div>
        <p className="text-xs text-slate-500 mt-1">Conteos pendientes, productos sin disponibilidad y stock bajo. Se muestran hasta 8 referencias.</p>
        <div className="overflow-x-auto mt-4"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500"><tr><th className="py-2">Producto</th><th>Situación</th><th className="text-right">Disponible</th><th className="text-right">Mínimo</th></tr></thead><tbody>
          {summary.alerts.slice(0, 8).map(item => <tr key={item.id} className="border-t border-slate-100">
            <td className="py-3 pr-4"><button type="button" onClick={() => openItemDetail(item)} className="text-left font-semibold hover:text-[#3e4e9e] hover:underline">{item.codigo} · {item.nombre}</button><p className="text-xs text-slate-500">{getLocationString(item)}</p></td>
            <td className="text-xs whitespace-nowrap">{stockStatus(item)}</td><td className="text-right whitespace-nowrap">{item.stockPendiente ? 'Sin confirmar' : `${number.format(available(item))} ${item.unidad}`}</td><td className="text-right whitespace-nowrap">{number.format(item.stockMinimo)} {item.unidad}</td>
          </tr>)}
        </tbody></table></div>
        {summary.alerts.length === 0 && <p className="py-6 text-sm text-emerald-700">No hay alertas de stock en este alcance.</p>}
        <p className="text-xs text-slate-500 mt-3">{summary.withoutMinimum} productos sin mínimo definido. Configurar mínimos permite detectar necesidades de reposición.</p>
      </section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><h3 className="font-bold">Organización de ubicaciones</h3><p className="text-xs text-slate-500 mt-1">Información de avance mientras se organizan los almacenes.</p>
          <dl className="space-y-3 mt-5 text-sm">{[['Sin almacén', items.filter(item => !item.almacenId).length], ['Sin estantería', summary.withoutRack], ['Sin caja', summary.withoutBox]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 pb-2"><dt>{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl>
          <button type="button" onClick={() => setActiveView('warehouses')} className="mt-4 text-xs font-bold text-[#3e4e9e] hover:underline">Ver almacenes</button>
        </section>
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><div className="flex justify-between"><h3 className="font-bold">Actividad reciente</h3><button type="button" onClick={() => setActiveView('history')} className="text-xs font-bold text-[#3e4e9e] hover:underline">Ver historial</button></div>
          <p className="text-xs text-slate-500 mt-1">Hasta 6 movimientos de los últimos 100 cargados, según el alcance.</p>
          <ul className="mt-4 divide-y divide-slate-100">{recent.map(row => <li key={row.id} className="py-3 text-xs"><div className="flex justify-between gap-3">
            {itemIndex.has(row.elementoId) ? <button type="button" onClick={() => openItemDetail(itemIndex.get(row.elementoId)!)} className="text-left font-semibold hover:underline">{row.itemCode} · {row.itemName}</button> : <strong>{row.itemCode} · {row.itemName}</strong>}<span className="shrink-0">{row.tipo}</span>
          </div><p className="text-slate-500 mt-1">{row.fecha} · {row.hora} · {row.responsable}</p><p className="mt-1">{number.format(row.cantidad)} {row.unidad} · {row.motivo}</p></li>)}</ul>
          {recent.length === 0 && <p className="py-6 text-sm text-slate-500">Sin movimientos recientes en este alcance.</p>}
        </section>
      </div>
    </>}
  </div>;
}
