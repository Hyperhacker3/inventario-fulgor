interface Props { remissionId?: string; onPdf: (id: string) => void; onPhotos: (id: string) => void }
export function MovementDocuments({ remissionId, onPdf, onPhotos }: Props) {
  if (!remissionId) return <span>—</span>;
  return <div className="flex flex-wrap gap-2 justify-start sm:justify-center">
    <button type="button" onClick={() => onPdf(remissionId)} aria-label="Ver remisión PDF" className="min-h-10 px-2.5 py-1 bg-[#eaedff] text-[#253685] rounded-md font-semibold">PDF</button>
    <button type="button" onClick={() => onPhotos(remissionId)} aria-label="Ver fotografías de la salida" className="min-h-10 px-2.5 py-1 bg-green-50 text-green-800 rounded-md font-semibold flex items-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-sm">photo_library</span>Fotos</button>
  </div>;
}
