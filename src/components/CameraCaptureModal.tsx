import { useRef, useState } from 'react';
import { useCamera } from '../shared/useCamera';
import { squareCanvas } from '../shared/squareImage';

interface Props { isOpen: boolean; onClose: () => void; onPhotoCaptured: (photoDataUrl: string) => void; title?: string }
export function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured, title = 'Tomar foto' }: Props) {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [photo, setPhoto] = useState<string | null>(null);
  const { videoRef, loading, error, ready } = useCamera(isOpen && !photo, facingMode);
  const fileRef = useRef<HTMLInputElement>(null);
  const close = () => { setPhoto(null); onClose(); };
  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = squareCanvas(video, video.videoWidth, video.videoHeight, 1024, facingMode === 'user');
    setPhoto(canvas.toDataURL('image/jpeg', 0.78));
  };
  const selectFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) { window.alert('Seleccione una imagen de hasta 8 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4">
      <div className="flex justify-between"><h2 className="font-bold">{title}</h2><button aria-label="Cerrar cámara" onClick={close}>×</button></div>
      <div className="relative w-full max-w-[min(100%,45vh)] mx-auto aspect-square overflow-hidden rounded-lg bg-black">
        {photo ? <img src={photo} alt="Vista previa" className="absolute inset-0 w-full h-full object-cover object-center" />
          : <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-cover object-center" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }} />}
      </div>
      <p className="text-xs text-slate-500">Encuadre el producto dentro del cuadrado. La captura conserva este recorte centrado.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm">Abriendo cámara…</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => selectFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="border rounded-lg px-3 py-2 text-sm">Elegir archivo</button>
        {!photo && <button type="button" onClick={() => setFacingMode(current => current === 'environment' ? 'user' : 'environment')} className="border rounded-lg px-3 py-2 text-sm">Cambiar cámara</button>}
        {!photo && <button type="button" disabled={!ready} onClick={snap} className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm">Capturar</button>}
        {photo && <><button type="button" onClick={() => setPhoto(null)} className="border rounded-lg px-3 py-2 text-sm">Repetir</button>
          <button type="button" onClick={() => { onPhotoCaptured(photo); close(); }} className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm">Usar foto</button></>}
      </div>
    </section>
  </div>;
}
