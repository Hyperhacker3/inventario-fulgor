import React, { useRef, useState, useEffect } from 'react';
import { Remision } from '../types';

interface PdfRemissionModalProps {
  remision: Remision | null;
  onClose: () => void;
}

export const PdfRemissionModal: React.FC<PdfRemissionModalProps> = ({ remision, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '75' | '50'>('fit');
  const [computedScale, setComputedScale] = useState<number>(1);

  // Compute fit scale dynamically based on available container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // 16px padding on each side
        const a4Width = 794; // Standard A4 width in pixels at 96 DPI
        if (scaleMode === 'fit') {
          const fitRatio = Math.min(1, containerWidth / a4Width);
          setComputedScale(Math.max(0.38, fitRatio));
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

  const totalUnidades = remision.items.reduce((sum, item) => sum + item.cantidad, 0);

  const handlePrint = () => {
    window.print();
  };

  const a4Width = 794;
  const a4MinHeight = 1123; // Standard A4 height proportion

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 overflow-hidden">
      {/* Container Dialog */}
      <div className="bg-[#1e293b] text-white rounded-2xl max-w-5xl w-full flex flex-col h-[98vh] shadow-2xl border border-slate-700 overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 px-3 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#3e4e9e] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">picture_as_pdf</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-white leading-tight truncate">
                Vista de Remisión Oficial FULGOR
              </h3>
              <p className="text-[11px] sm:text-xs font-mono-code text-[#93c5fd] font-bold truncate">
                {remision.numeroRemision} • {remision.proyectoNombre}
              </p>
            </div>
          </div>

          {/* Scale & Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Zoom / Scale Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScaleMode('fit')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === 'fit' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="Ajustar automáticamente al ancho de la pantalla"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('100')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === '100' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="Ver a escala real 100%"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('75')}
                className={`hidden sm:inline-block px-2 py-1 rounded font-medium transition-colors ${
                  scaleMode === '75' ? 'bg-[#3e4e9e] text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                75%
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              id="btn-print-remision"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#3e4e9e] hover:bg-[#323f80] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">print</span>
              <span className="hidden xs:inline">Imprimir / PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-close-pdf-modal"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Mobile Format Hint */}
        <div className="no-print bg-slate-950/80 px-3 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">verified</span>
            <span>Formato A4 Estándar FULGOR (Preserva Proporciones de Impresión)</span>
          </span>
          <span className="text-[10px] font-mono-code text-slate-400 shrink-0 ml-2">
            Escala: {Math.round(computedScale * 100)}%
          </span>
        </div>

        {/* Scrollable Printable A4 Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-2 sm:p-6 flex justify-center items-start bg-[#475569]/30"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Scaled Wrapper: keeps the A4 sheet rigidly at 794px width without wrapping or breaking */}
          <div
            style={{
              width: `${a4Width * computedScale}px`,
              minHeight: `${a4MinHeight * computedScale}px`,
              transition: 'width 0.15s ease-out, min-height 0.15s ease-out',
            }}
            className="shrink-0 flex justify-center"
          >
            <div
              ref={printRef}
              style={{
                width: `${a4Width}px`,
                minHeight: `${a4MinHeight}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'top left',
              }}
              className="a4-print-container bg-white text-[#131b2e] p-8 sm:p-12 rounded-xl shadow-2xl border border-[#cbd5e1] flex flex-col justify-between select-text"
            >
              {/* Top Section */}
              <div>
                {/* Header */}
                <div className="flex justify-between items-start pb-5 border-b-2 border-[#253685]">
                  {/* Brand Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-[#253685] flex items-center justify-center text-white shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        solar_power
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-[#253685] tracking-tight">FULGOR S.A.S.</h1>
                      <p className="text-[11px] font-bold text-[#454651] tracking-wider uppercase">NIT 901.458.789-2</p>
                      <p className="text-[11px] text-[#767682]">Logística Fotovoltaica & Suministros Solares</p>
                      <p className="text-[11px] text-[#767682]">PBX: (+57) 601 745 8800 • Bogotá D.C., Colombia</p>
                    </div>
                  </div>

                  {/* Remission Box */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold tracking-widest text-[#454651] uppercase block mb-1">
                      REMISIÓN DE ENTREGA
                    </span>
                    <div className="font-mono-code font-bold text-lg text-[#dd4c42] bg-[#fce8e6] px-3.5 py-1 rounded-lg border border-[#ffdad6] inline-block shadow-2xs">
                      {remision.numeroRemision}
                    </div>
                    <p className="text-xs text-[#454651] mt-1.5">
                      <strong>Fecha:</strong> {remision.fecha}
                    </p>
                  </div>
                </div>

                {/* Project & Client Information Box */}
                <div className="my-5 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      PROYECTO DE DESTINO
                    </span>
                    <p className="font-bold text-sm text-[#253685]">{remision.proyectoNombre}</p>
                    <p className="text-[#454651] mt-0.5">{remision.ubicacion}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      CLIENTE / TITULAR
                    </span>
                    <p className="font-bold text-sm text-[#131b2e]">{remision.cliente}</p>
                    <p className="text-[#454651] mt-0.5">Entrega Directa en Sitio de Obra Solar</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      DESPACHADO POR (BODEGA)
                    </span>
                    <p className="font-semibold text-[#131b2e]">{remision.entregadoPor}</p>
                    <p className="text-[#767682]">{remision.cargoEntregado}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      RECIBE EN SITIO (OBRA)
                    </span>
                    <p className="font-semibold text-[#131b2e]">{remision.recibidoPor}</p>
                    <p className="text-[#767682]">{remision.cargoRecibido}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#253685] text-white">
                        <th className="p-2.5 rounded-l-lg text-center w-10">#</th>
                        <th className="p-2.5 w-24">CÓDIGO</th>
                        <th className="p-2.5">DESCRIPCIÓN DEL COMPONENTE SOLAR</th>
                        <th className="p-2.5 text-right w-24">CANTIDAD</th>
                        <th className="p-2.5 rounded-r-lg text-center w-16">UNIDAD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {remision.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}>
                          <td className="p-2.5 text-center font-mono-code text-[#767682]">{idx + 1}</td>
                          <td className="p-2.5 font-mono-code font-bold text-[#253685]">{item.codigo}</td>
                          <td className="p-2.5 font-medium text-[#131b2e]">{item.nombre}</td>
                          <td className="p-2.5 text-right font-mono-code font-bold text-sm text-[#131b2e]">
                            {item.cantidad}
                          </td>
                          <td className="p-2.5 text-center text-[#767682] font-mono-code">{item.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#253685] bg-[#eaedff]/60 font-bold">
                        <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-[#253685]">
                          Total Unidades Despachadas:
                        </td>
                        <td className="p-2.5 text-right font-mono-code text-sm text-[#253685]">
                          {totalUnidades}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-[#253685]">ITEMS</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Observaciones */}
                <div className="p-3.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-xs mb-6">
                  <span className="font-bold uppercase text-[10px] text-[#767682] block mb-1">
                    OBSERVACIONES & CONDICIONES DE TRANSPORTE
                  </span>
                  <p className="text-[#454651] leading-relaxed">
                    {remision.observaciones ||
                      'Material verificado técnica y físicamente en bodega. La custodia y manipulación pasa a ser responsabilidad del receptor en sitio.'}
                  </p>
                </div>
              </div>

              {/* Signatures & Footer Section */}
              <div>
                {/* Signatures Section */}
                <div className="pt-6 border-t border-[#cbd5e1] grid grid-cols-2 gap-12 text-xs">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-full border-b border-[#131b2e] mb-2 pb-8 text-[#cbd5e1] italic">
                      Firma responsable despacho
                    </div>
                    <span className="font-bold text-[#131b2e]">{remision.entregadoPor}</span>
                    <span className="text-[11px] text-[#767682]">{remision.cargoEntregado}</span>
                    <span className="text-[10px] text-[#767682] mt-0.5">FULGOR S.A.S. - Bodega Central</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-full border-b border-[#131b2e] mb-2 pb-8 text-[#cbd5e1] italic">
                      Firma recibido a conformidad
                    </div>
                    <span className="font-bold text-[#131b2e]">{remision.recibidoPor}</span>
                    <span className="text-[11px] text-[#767682]">{remision.cargoRecibido}</span>
                    <span className="text-[10px] text-[#767682] mt-0.5">{remision.proyectoNombre}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-6 border-t border-[#e2e8f0] flex justify-between items-center text-[10px] text-[#767682]">
                  <span>Documento generado por Sistema Logístico FULGOR S.A.S. v2.4</span>
                  <span>ISO 9001:2015 • Gestión de Calidad Solar</span>
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

