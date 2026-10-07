import { useMotionActive } from './ui/Motion';
import { useDialogFocus } from '../hooks/useDialogFocus';
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Remision } from '../types';
import { RemissionDocument } from './remission/RemissionDocument';

interface PdfRemissionModalProps {
  remision: Remision | null;
  onClose: () => void;
}

export const PdfRemissionModal: React.FC<PdfRemissionModalProps> = ({ remision, onClose }) => {
  const active = useMotionActive();
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, onClose);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '75' | '50'>('fit');
  const [computedScale, setComputedScale] = useState<number>(1);
  const [printReady, setPrintReady] = useState(false);
  useEffect(() => {
    const original = document.title;
    if (remision) document.title = remision.numeroRemision;
    return () => { document.title = original; };
  }, [remision]);

  // Compute fit scale dynamically based on available container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // 16px padding on each side
        const a4Width = 794; // Standard A4 width in pixels at 96 DPI
        if (scaleMode === 'fit') {
          const fitRatio = Math.min(1, containerWidth / a4Width);
          setComputedScale(Math.max(0.15, fitRatio));
        } else if (scaleMode === '100') {
          setComputedScale(1);
        } else if (scaleMode === '75') {
          setComputedScale(0.75);
        } else if (scaleMode === '50') {
          setComputedScale(0.5);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [scaleMode, remision]);

  if (!remision) return null;

  const handlePrint = () => {
    window.print();
  };

  const a4Width = 794;
  const a4MinHeight = 1123; // Standard A4 height proportion

  return createPortal(
    <div data-motion-open={active} inert={!active} aria-hidden={!active || undefined} className="print-layer fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 overflow-hidden">
      {/* Container Dialog */}
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Vista de remisión" className="ui-dialog-panel ui-surface ui-panel-enter bg-white rounded-2xl max-w-5xl w-full flex flex-col h-[98dvh] shadow-2xl border overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-[#f8fafc] px-3 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#3e4e9e] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">picture_as_pdf</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-[#131b2e] leading-tight truncate">
                Vista de Remisión Oficial EL TURPIAL
              </h3>
              <p className="text-[11px] sm:text-xs font-mono-code text-[#253685] font-bold truncate">
                {remision.numeroRemision} • {remision.proyectoNombre}
              </p>
            </div>
          </div>

          {/* Scale & Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Zoom / Scale Selector */}
            <div className="ui-inset flex items-center rounded-lg p-0.5 border text-xs">
              <button
                type="button"
                onClick={() => setScaleMode('fit')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === 'fit' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-600 hover:text-[#253685]'
                }`}
                title="Ajustar automáticamente al ancho de la pantalla"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('100')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === '100' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-600 hover:text-[#253685]'
                }`}
                title="Ver a escala real 100%"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('75')}
                className={`hidden sm:inline-block px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === '75' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-600 hover:text-[#253685]'
                }`}
              >
                75%
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={!printReady}
              id="btn-print-remision"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#3e4e9e] hover:bg-[#323f80] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">print</span>
              <span>{printReady ? 'Imprimir / PDF' : 'Preparando…'}</span>
            </button>

            {/* Close Button */}
            <button
              data-dialog-close onClick={onClose}
              id="btn-close-pdf-modal"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white hover:bg-slate-100 border text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Mobile Format Hint */}
        <div className="no-print bg-[#f8fafc] px-3 py-1.5 border-b text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">verified</span>
            <span>Formato A4 Estándar EL TURPIAL (Preserva Proporciones de Impresión)</span>
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 shrink-0 ml-2">
            Escala: {Math.round(computedScale * 100)}%
          </span>
        </div>

        {/* Scrollable Printable A4 Area */}
        <div
          ref={containerRef}
          className="print-preview-scroll flex-1 overflow-auto p-2 sm:p-6 flex justify-center items-start bg-[#f8fafc]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Scaled Wrapper: keeps the A4 sheet rigidly at 794px width without wrapping or breaking */}
          <div
            style={{
              width: `${a4Width * computedScale}px`,
              minHeight: `${a4MinHeight * computedScale}px`,
              transition: 'width 0.15s ease-out, min-height 0.15s ease-out',
            }}
            className="print-scale-wrapper shrink-0 flex justify-center"
          >
            <RemissionDocument remision={remision} scale={computedScale} onReady={setPrintReady} />
          </div>
        </div>
      </div>
    </div>, document.body
  );
};

