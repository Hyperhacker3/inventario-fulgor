import { useRef, useState, type ChangeEvent } from 'react';
import { ItemImage } from './ItemImage';
import { CameraCaptureModal } from './CameraCaptureModal';

export function ItemPhotoPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState('');
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      setError('Seleccione una imagen de hasta 8 MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') onChange(reader.result); };
    reader.onerror = () => setError('No se pudo leer la imagen.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return (
    <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
      <label className="text-xs font-bold tracking-wider text-[#454651] uppercase">Fotografía del componente</label>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button type="button" onClick={() => setCameraOpen(true)} className="px-3 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold">Tomar foto</button>
        <button type="button" onClick={() => input.current?.click()} className="px-3 py-2 rounded-lg border text-xs font-semibold">Subir archivo</button>
        {value && <button type="button" onClick={() => onChange('')} className="px-3 py-2 rounded-lg border text-xs font-semibold">Quitar foto</button>}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={upload} />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-3 items-center">
        <div className="w-32 h-28 rounded-xl border overflow-hidden bg-white flex items-center justify-center shrink-0">
          {value ? <ItemImage source={value} alt="Vista previa" className="w-full h-full object-cover" /> :
            <span className="text-xs text-[#64748b]">Sin imagen</span>}
        </div>
        <input type="url" value={value.startsWith('data:') || value.startsWith('storage://') ? '' : value}
          onChange={event => onChange(event.target.value)} placeholder="https://ejemplo.com/foto.jpg"
          aria-label="URL de la foto" className="w-full px-3.5 py-2.5 rounded-lg border text-sm" />
      </div>
      {error && <p role="alert" className="text-red-700 text-xs mt-2">{error}</p>}
      <CameraCaptureModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)}
        onPhotoCaptured={photo => { onChange(photo); setCameraOpen(false); }} title="Tomar foto del componente" />
    </div>
  );
}
