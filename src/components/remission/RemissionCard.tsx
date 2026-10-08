import type { Remision } from '../../types';

export function RemissionCard({ remission: rem, onPdf, onPhotos }: {
  remission: Remision; onPdf: () => void; onPhotos: () => void;
}) {
  return <article className="min-w-0 bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:shadow-md hover:border-[#cbd5e1] transition-all group">
    <div className="flex flex-col items-start gap-2 mb-3">
      <div className="remission-card-heading grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 w-full">
        <span className="min-w-0 max-w-full justify-self-start break-words [overflow-wrap:anywhere] font-mono-code font-bold text-xs bg-[#fce8e6] text-[#dd4c42] border border-[#ffdad6] px-2.5 py-1 rounded-lg">{rem.numeroRemision}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onPdf} title="Ver / Imprimir PDF" aria-label={`Ver / Imprimir PDF de ${rem.numeroRemision}`}
            className="w-11 h-11 rounded-xl text-[#253685] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">picture_as_pdf</span>
          </button>
          <button type="button" onClick={onPhotos} title="Ver fotografías de la salida" aria-label={`Ver fotografías de ${rem.numeroRemision}`}
            className="w-11 h-11 rounded-xl text-green-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">photo_library</span>
          </button>
        </div>
      </div>
      <span className="text-xs text-[#767682] font-medium">{rem.fecha}</span>
    </div>
    <h3 className="font-bold text-base text-[#131b2e] leading-snug mb-1 group-hover:text-[#3e4e9e] transition-colors">{rem.proyectoNombre}</h3>
    <p className="text-xs text-[#454651] mb-3">{rem.cliente}</p>
    <p className="text-sm text-[#454651]">Materiales de salida: <strong>{rem.items.length}</strong></p>
  </article>;
}
