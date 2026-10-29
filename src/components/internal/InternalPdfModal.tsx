import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InternalDispatch } from '../../domain/internalDispatch';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useMotionActive } from '../ui/Motion';
import { InternalPrintDocument } from './InternalPrintDocument';

export function InternalPdfModal({loan,onClose}:{loan:InternalDispatch;onClose:()=>void}) {
  const active=useMotionActive(),dialog=useRef<HTMLDivElement>(null),container=useRef<HTMLDivElement>(null);
  const [fit,setFit]=useState(true),[scale,setScale]=useState(1),[ready,setReady]=useState(false);
  useDialogFocus(dialog,onClose);
  useEffect(()=>{const previous=document.title;document.title=loan.codigo;return()=>{document.title=previous;};},[loan.codigo]);
  useEffect(()=>{
    const update=()=>setScale(fit?Math.max(.15,Math.min(1,((container.current?.clientWidth||826)-32)/794)):1);
    update();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);if(container.current)observer?.observe(container.current);
    window.addEventListener('resize',update);return()=>{observer?.disconnect();window.removeEventListener('resize',update);};
  },[fit]);
  return createPortal(<div data-motion-open={active} inert={!active} aria-hidden={!active||undefined} className="print-layer fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-1 sm:p-4 overflow-hidden">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Comprobante de salida interna" className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl max-w-5xl w-full flex flex-col h-[98dvh] overflow-hidden">
      <div className="no-print p-3 flex flex-wrap gap-3 justify-between items-center"><h3 className="font-bold break-words">Salida interna · {loan.codigo}</h3><div className="flex flex-wrap gap-2">
        <button type="button" className="ui-flat-choice rounded-xl px-3 py-2" aria-pressed={fit} onClick={()=>setFit(true)}>Ajustar</button><button type="button" className="ui-flat-choice rounded-xl px-3 py-2" aria-pressed={!fit} onClick={()=>setFit(false)}>100%</button>
        <button type="button" disabled={!active||!ready} onClick={()=>window.print()} className="rounded-xl px-4 py-2">Imprimir / Guardar PDF</button><button type="button" data-dialog-close aria-label="Cerrar comprobante" onClick={onClose} className="rounded-xl px-4 py-2 text-red-700">×</button>
      </div></div><div ref={container} className="print-preview-scroll flex-1 min-h-0 overflow-auto p-4 bg-slate-200"><div className="print-scale-wrapper min-w-fit flex justify-center"><InternalPrintDocument loan={loan} scale={scale} onReady={setReady} /></div></div>
      <p className="no-print text-xs p-3">Elija Guardar como PDF en la ventana de impresión. El comprobante conserva la entrega original y las devoluciones consultadas.</p>
    </div></div>,document.body);
}
