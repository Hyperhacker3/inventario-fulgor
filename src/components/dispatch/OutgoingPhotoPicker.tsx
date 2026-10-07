import { useId, useRef, useState, type ChangeEvent } from 'react';
import { CameraCaptureModal } from '../CameraCaptureModal';
import { evidenceCanvas } from '../../shared/evidenceCanvas';
import { errorMessage } from '../../shared/errors';

interface Props { photos: string[]; onChange: (photos: string[]) => void; disabled?: boolean; onBusyChange: (busy: boolean) => void }
export function OutgoingPhotoPicker({ photos, onChange, disabled, onBusyChange }: Props) {
  const heading = useId();
  const input = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reading = useRef(false);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length || reading.current) return;
    if (files.some(file => !file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) { setError('Seleccione imágenes de hasta 8 MB cada una.'); return; }
    reading.current = true; setBusy(true); onBusyChange(true); setError('');
    try {
      const prepared: string[] = [];
      for (const file of files) {
        const image = await createImageBitmap(file);
        try { prepared.push(evidenceCanvas(image, image.width, image.height).toDataURL('image/jpeg', 0.78)); }
        finally { image.close(); }
      }
      onChange([...photos, ...prepared]);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { reading.current = false; setBusy(false); onBusyChange(false); }
  };
  return <fieldset aria-labelledby={heading} disabled={disabled || busy} className="min-w-0 rounded-xl border bg-slate-50 p-4 sm:p-5 space-y-3">
    <h3 id={heading} className="min-w-0 break-words text-sm font-bold">Registro fotográfico de la salida ({photos.length})</h3>
    <p className="text-xs text-slate-600">Opcional. Las fotos se guardarán con la salida y se consultarán en el historial. Quedan fuera de la remisión PDF.</p>
    <div className="responsive-actions"><button type="button" onClick={() => setCamera(true)} className="px-2 py-2 rounded-lg bg-[#253685] text-white text-sm">Tomar foto</button><button type="button" onClick={() => input.current?.click()} className="px-2 py-2 rounded-lg border bg-white text-sm">Subir fotografías</button></div>
    <input autoComplete="off" autoCorrect="off" spellCheck={false} ref={input} type="file" accept="image/*" multiple className="hidden" onChange={event => { void upload(event); }} />
    <div className="photo-tiles">{photos.map((photo, index) => <div key={`${index}-${photo.slice(-40)}`} className="min-w-0 space-y-1"><div className="aspect-square bg-white border rounded-lg overflow-hidden"><img src={photo} alt={`Registro de salida, foto ${index + 1}`} className="w-full h-full object-contain" /></div><button type="button" onClick={() => onChange(photos.filter((_, position) => position !== index))} aria-label={`Quitar foto de salida ${index + 1}`} className="w-full min-h-11 text-xs text-red-700">Quitar foto {index + 1}</button></div>)}</div>
    <p className="text-xs text-slate-500">Se conserva la foto completa, comprimida a un máximo de 600 píxeles en su lado mayor.</p>
    {busy && <p role="status" className="text-xs">Preparando fotografías…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <CameraCaptureModal square={false} isOpen={camera} onClose={() => setCamera(false)} title="Registro fotográfico de la salida" onPhotoCaptured={photo => onChange([...photos, photo])} />
  </fieldset>;
}
