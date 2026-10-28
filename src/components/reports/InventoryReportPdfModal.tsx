import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InventoryReport } from '../../domain/inventoryReport';
import { remissionDate } from '../../domain/remissionRoute';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useMotionActive } from '../ui/Motion';
import { InventoryReportDocument } from './InventoryReportDocument';

export function InventoryReportPdfModal({ report, onClose }: { report: InventoryReport; onClose: () => void }) {
  const active = useMotionActive(), dialog = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'fit' | '100'>('fit'), [scale, setScale] = useState(1), [ready, setReady] = useState(false);
  useDialogFocus(dialog, onClose);
  useEffect(() => {
    const title = document.title;
    document.title = `Informe-inventario-${remissionDate(new Date(report.createdAt))}`;
    return () => { document.title = title; };
  }, [report]);
  useEffect(() => {
    const update = () => setScale(mode === '100' ? 1 : Math.max(0.15, Math.min(1, ((container.current?.clientWidth || 826) - 32) / 794)));
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (container.current) observer?.observe(container.current);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, [mode]);
  return createPortal(<div data-motion-open={active} inert={!active} aria-hidden={!active || undefined} className="print-layer fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-1 sm:p-4 overflow-hidden">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Vista del informe de inventario" className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl max-w-5xl w-full flex flex-col h-[98dvh] overflow-hidden">
      <div className="no-print bg-slate-50 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div><h3 className="font-bold text-sm sm:text-base">Informe de inventario</h3><p className="text-xs text-slate-600">{report.rows.length} producto(s) · {report.company.nombre}</p></div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" aria-pressed={mode === 'fit'} onClick={() => setMode('fit')} className="ui-flat-choice rounded-xl px-3 min-h-11 text-sm">Ajustar</button>
          <button type="button" aria-pressed={mode === '100'} onClick={() => setMode('100')} className="ui-flat-choice rounded-xl px-3 min-h-11 text-sm">100%</button>
          <button type="button" disabled={!ready || !active} onClick={() => window.print()} className="rounded-xl px-4 min-h-11 text-sm font-bold text-[#3e4e9e]">Imprimir / Guardar PDF</button>
          <button type="button" data-dialog-close aria-label="Cerrar informe" onClick={onClose} className="rounded-xl min-w-11 min-h-11 text-red-700 text-xl">×</button>
        </div>
      </div>
      <div ref={container} className="print-preview-scroll flex-1 min-h-0 overflow-auto p-4 bg-slate-200">
        <div className="print-scale-wrapper min-w-fit flex justify-center"><InventoryReportDocument report={report} scale={scale} onReady={setReady} /></div>
      </div>
      <p className="no-print text-xs text-slate-600 px-4 py-2">Para descargarlo, elija Guardar como PDF en la ventana de impresión.</p>
    </div>
  </div>, document.body);
}
