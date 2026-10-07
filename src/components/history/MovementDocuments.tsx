interface Props { remissionId?: string; onPdf: (id: string) => void; onPhotos: (id: string) => void }
export function MovementDocuments({ remissionId, onPdf, onPhotos }: Props) {
  if (!remissionId) return <span>—</span>;
  return <div className="movement-documents">
    <button type="button" onClick={() => onPdf(remissionId)} aria-label="Ver remisión PDF" className="px-2.5 rounded-xl text-[#253685] font-semibold flex items-center justify-center gap-1">PDF</button>
    <button type="button" onClick={() => onPhotos(remissionId)} aria-label="Ver fotografías de la salida" className="px-2.5 rounded-xl text-green-800 font-semibold flex items-center justify-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-sm">photo_library</span>Fotos</button>
  </div>;
}
