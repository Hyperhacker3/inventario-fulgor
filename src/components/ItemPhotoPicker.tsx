import { useRef, useState, type ChangeEvent } from 'react';
import { ItemImage } from './ItemImage';
import { CameraCaptureModal } from './CameraCaptureModal';
import type { CategoriaElemento } from '../types';

interface Props {
  value: string; additional: string[]; category?: CategoriaElemento; disabled?: boolean;
  onChange: (value: string) => void; onAdditionalChange: (values: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
}
const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
  reader.readAsDataURL(file);
});

export function ItemPhotoPicker({ value, additional, onChange, onAdditionalChange, category, disabled, onBusyChange }: Props) {
  const mainInput = useRef<HTMLInputElement>(null);
  const extraInput = useRef<HTMLInputElement>(null);
  const [cameraTarget, setCameraTarget] = useState<'main' | 'additional' | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const upload = async (event: ChangeEvent<HTMLInputElement>, main: boolean) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (files.some(file => !file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) {
      setError('Cada archivo debe ser una imagen de hasta 8 MB.'); return;
    }
    setError(''); setReading(true); onBusyChange?.(true);
    try {
      const photos: string[] = [];
      for (const file of files) photos.push(await readFile(file));
      if (main) onChange(photos[0]); else onAdditionalChange([...additional, ...photos]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron leer las fotos.'); }
    finally { setReading(false); onBusyChange?.(false); }
  };
  const makeMain = (index: number) => {
    onChange(additional[index]);
    onAdditionalChange(additional.flatMap((photo, position) => position === index ? (value ? [value] : []) : [photo]));
  };
  return <fieldset disabled={disabled || reading} className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl min-w-0">
    <legend className="text-xs font-bold tracking-wider text-[#454651] uppercase px-1">Fotografías del producto</legend>
    <div className="photo-editor-grid">
      <div className="min-w-0 space-y-3">
        <h3 className="text-sm font-bold">Imagen principal</h3>
        <div className="w-full max-w-60 mx-auto aspect-square rounded-xl border overflow-hidden"><ItemImage source={value} category={category} compact alt="Imagen principal" className="w-full h-full object-cover" /></div>
        <div className="responsive-actions">
          <button type="button" onClick={() => setCameraTarget('main')} className="px-2 py-2 rounded-lg bg-[#3e4e9e] text-white text-sm font-bold">Tomar foto</button>
          <button type="button" onClick={() => mainInput.current?.click()} className="px-2 py-2 rounded-lg border text-sm">Subir foto</button>
        </div>
        {value && <button type="button" onClick={() => onChange('')} className="min-h-11 w-full text-sm text-red-700">Quitar principal</button>}
        <input autoComplete="off" autoCorrect="off" spellCheck={false} ref={mainInput} type="file" accept="image/*" className="hidden" onChange={event => void upload(event, true)} />
      </div>
      <div className="min-w-0 space-y-3">
        <h3 className="text-sm font-bold">Imágenes adicionales ({additional.length})</h3>
        {!additional.length && <p className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-slate-500">Puedes añadir más fotos del producto.</p>}
        <div className="photo-tiles">
          {additional.map((photo, index) => <div key={`${index}-${photo.slice(-40)}`} className="min-w-0">
            <div className="relative aspect-square rounded-lg border overflow-hidden"><ItemImage source={photo} category={category} compact alt={`Foto adicional ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              <button type="button" onClick={() => onAdditionalChange(additional.filter((_, position) => position !== index))} aria-label={`Quitar foto adicional ${index + 1}`} className="absolute top-1 right-1 w-11 h-11 rounded-lg bg-white/95 shadow text-red-700 text-xl">×</button>
            </div>
            <button type="button" onClick={() => makeMain(index)} aria-label={`Usar foto ${index + 1} como principal`} className="w-full min-h-11 rounded-lg border bg-white text-xs font-semibold text-[#3e4e9e] mt-1">Hacer principal</button>
          </div>)}
        </div>
        <div className="responsive-actions">
          <button type="button" onClick={() => extraInput.current?.click()} className="px-2 py-2 rounded-lg border text-sm font-semibold">Añadir fotos</button>
          <button type="button" onClick={() => setCameraTarget('additional')} className="px-2 py-2 rounded-lg border text-sm font-semibold">Tomar foto adicional</button>
        </div>
        <input autoComplete="off" autoCorrect="off" spellCheck={false} ref={extraInput} type="file" accept="image/*" multiple className="hidden" onChange={event => void upload(event, false)} />
      </div>
    </div>
    <input autoComplete="off" autoCorrect="off" spellCheck={false} type="url" value={/^(data:|storage:|blob:)/.test(value) ? '' : value} onChange={event => onChange(event.target.value)} placeholder="URL opcional para la imagen principal" aria-label="URL de la imagen principal" className="w-full mt-4 px-3 py-2 rounded-lg border text-sm" />
    <p className="text-xs text-slate-500 mt-3">Fotos cuadradas de hasta 600 × 600. Se suben a Supabase al guardar. Puedes seleccionar varios archivos adicionales.</p>
    {!value && additional.length > 0 && <p className="text-xs text-[#3e4e9e] mt-2">La primera foto adicional se usará como principal al guardar.</p>}
    {reading && <p role="status" className="text-xs mt-2">Preparando fotos…</p>}
    {error && <p role="alert" className="text-red-700 text-xs mt-2">{error}</p>}
    <CameraCaptureModal isOpen={cameraTarget !== null} onClose={() => setCameraTarget(null)} title={cameraTarget === 'additional' ? 'Tomar foto adicional' : 'Tomar imagen principal'}
      onPhotoCaptured={photo => { if (cameraTarget === 'main') onChange(photo); else onAdditionalChange([...additional, photo]); setCameraTarget(null); }} />
  </fieldset>;
}
