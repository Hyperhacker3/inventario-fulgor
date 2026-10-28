import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readInventoryReportsPage, readSavedInventoryReport } from '../../data/inventoryReport';
import { reportDate, reportQuantities, type InventoryReport } from '../../domain/inventoryReport';
import { formatCOP } from '../../domain/money';
import { errorMessage } from '../../shared/errors';
import { useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';

interface Props {
  account: string; onOpen: (report: InventoryReport) => void;
  readPage?: typeof readInventoryReportsPage; readReport?: typeof readSavedInventoryReport;
}
export function InventoryReportHistory({ account, onOpen, readPage = readInventoryReportsPage, readReport = readSavedInventoryReport }: Props) {
  const [page, setPage] = useState(1), [opening, setOpening] = useState<string | null>(null), [error, setError] = useState('');
  const active = useMotionActive(), live = useRef(true), busy = useRef(false);
  useEffect(() => { live.current = active; return () => { live.current = false; }; }, [active]);
  const query = useQuery({ queryKey: ['fulgor', account, 'inventory-reports', page], queryFn: () => readPage(page), enabled: active, retry: false });
  const pages = Math.max(1, Math.ceil((query.data?.total || 0) / 20));
  const open = async (id: string) => {
    if (busy.current || !active) return;
    busy.current = true; setOpening(id); setError('');
    try { const report = await readReport(id); if (live.current) onOpen(report); }
    catch (cause) { if (live.current) setError(errorMessage(cause)); }
    finally { busy.current = false; if (live.current) setOpening(null); }
  };
  return <section className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-5" aria-busy={query.isFetching || !!opening}>
    <div className="flex flex-wrap gap-4 items-center justify-between">
      <div><h2 className="text-2xl md:text-3xl font-bold">Historial de informes</h2>
        <p className="text-sm text-slate-600 mt-2">Consulte e imprima los informes con los datos guardados al generarlos.</p></div>
      <button type="button" className="rounded-xl px-4 min-h-11 text-[#087f8c]" disabled={query.isFetching || !!opening} onClick={() => { void query.refetch(); }}>Actualizar</button>
    </div>
    {(query.error || error) && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error || errorMessage(query.error)}</p>}
    {query.isPending && !query.error && <p role="status">Cargando informes…</p>}
    {!query.isPending && !query.error && !query.data?.rows.length && <p className="rounded-2xl bg-white p-5">Todavía no hay informes guardados.</p>}
    <ul className="grid gap-4 md:grid-cols-2">
      {query.data?.rows.map(row => <li key={row.id} className="min-w-0 rounded-2xl bg-white p-5 space-y-3">
        <h3 className="font-bold">Informe del {reportDate(row.created_at)}</h3>
        <p className="text-xs text-slate-500 break-all">Referencia: {row.id}</p>
        <p className="text-sm break-words">Generado por: {row.generated_by}</p>
        <dl className="text-sm space-y-2">
          <div><dt className="text-slate-500">Productos</dt><dd className="font-bold">{row.product_count}</dd></div>
          <div><dt className="text-slate-500">Cantidades por unidad</dt><dd className="break-words">{reportQuantities(row)}</dd></div>
          <div><dt className="text-slate-500">{row.pending_value ? 'Valor parcial conocido' : 'Valor de stock'}</dt><dd>{row.pending_value === row.product_count ? 'Sin cantidades verificadas' : formatCOP(Number(row.value_cop))}</dd></div>
        </dl>
        <button type="button" disabled={!!opening} onClick={() => { void open(row.id); }} className="rounded-xl px-4 min-h-11 text-[#3e4e9e] inline-flex gap-2 items-center">
          <StateIcon icon="picture_as_pdf" />{opening === row.id ? 'Abriendo…' : 'Ver / Imprimir PDF'}
        </button>
      </li>)}
    </ul>
    <nav aria-label="Páginas del historial de informes" className="flex flex-wrap justify-center items-center gap-4">
      <button type="button" disabled={page <= 1 || query.isFetching || !!opening} onClick={() => setPage(value => value - 1)} className="rounded-xl min-h-11 px-4 text-sm">Anterior</button>
      <span className="text-sm">Página {page} de {pages}</span>
      <button type="button" disabled={page >= pages || query.isFetching || !!opening} onClick={() => setPage(value => value + 1)} className="rounded-xl min-h-11 px-4 text-sm">Siguiente</button>
    </nav>
  </section>;
}
