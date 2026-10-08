import { createPortal } from 'react-dom';
import { Presence, useMotionActive } from './ui/Motion';
import { Select } from './ui/Select';
import { useRef, useState } from 'react';
import { useCamera } from '../shared/useCamera';
import { squareCanvas } from '../shared/squareImage';
import { nextCameraId } from '../shared/cameraDevices';
import { evidenceCanvas } from '../shared/evidenceCanvas';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { readCameraPreference } from '../shared/cameraPreference';

interface Props { isOpen: boolean; onClose: () => void; onPhotoCaptured: (photoDataUrl: string) => void; title?: string; square?: boolean; multiple?: boolean }
export function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured, title = 'Tomar foto', square = true, multiple = false }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const active = useMotionActive();
  const [selection, setSelection] = useState(() => ({ open: isOpen, id: readCameraPreference() }));
  const [addedCount, setAddedCount] = useState(0);
  const acceptedPhoto = useRef<string | null>(null);
  if (selection.open !== isOpen) {
    setSelection({ open: isOpen, id: isOpen ? readCameraPreference() : selection.id });
    if (isOpen) { setPhoto(null); setAddedCount(0); }
  }
  const selectedDeviceId = selection.id;
  const setSelectedDeviceId = (id: string) => setSelection(current => ({ ...current, id }));
  const { videoRef, loading, error, ready, cameras, currentDeviceId, rearOnly } = useCamera(active && isOpen && !photo, selectedDeviceId, square ? 1 : 4 / 3, true);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const close = () => { setPhoto(null); setAddedCount(0); onClose(); };
  useDialogFocus(dialog, close, isOpen);
  const snap = () => {
    const video = videoRef.current;
    if (!active || !isOpen || !ready || !video || !video.videoWidth) return;
    const canvas = square ? squareCanvas(video, video.videoWidth, video.videoHeight, 600)
      : evidenceCanvas(video, video.videoWidth, video.videoHeight);
    acceptedPhoto.current = null;
    setPhoto(canvas.toDataURL('image/jpeg', 0.78));
  };
  const selectFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) { window.alert('Seleccione una imagen de hasta 8 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { acceptedPhoto.current = null; setPhoto(String(reader.result || '')); };
    reader.readAsDataURL(file);
  };
  const acceptPhoto = (finish: boolean) => {
    if (!active || !isOpen || !photo || acceptedPhoto.current === photo) return;
    acceptedPhoto.current = photo;
    onPhotoCaptured(photo);
    if (finish) close();
    else { setSelectedDeviceId(readCameraPreference()); setAddedCount(count => count + 1); setPhoto(null); }
  };
  return createPortal(<Presence open={active && isOpen}><div className="ui-modal-layer fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label={title} className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 space-y-4">
      <div className="flex justify-between"><h2 className="font-bold">{title}</h2><button type="button" data-dialog-close aria-label="Cerrar cámara" className="min-w-11 min-h-11" onClick={close}>×</button></div>
      <div className={`relative w-full max-w-[min(100%,45vh)] mx-auto ${square ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden rounded-lg bg-black`}>
        {photo ? <img src={photo} alt="Vista previa" className={`absolute inset-0 w-full h-full ${square ? 'object-cover' : 'object-contain'} object-center`} />
          : <video ref={videoRef} muted playsInline autoPlay className={`absolute inset-0 w-full h-full ${square ? 'object-cover' : 'object-contain'} object-center`} />}
      </div>
      <p className="text-xs text-slate-500">{square ? 'Encuadre el producto dentro del cuadrado. La captura conserva este recorte centrado.' : 'La captura conserva el encuadre completo para el registro de la salida.'}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {error && selectedDeviceId && <button type="button" onClick={() => setSelectedDeviceId('')} className="border rounded-lg px-3 py-2 text-sm">{rearOnly ? 'Volver a la cámara trasera principal' : 'Volver a la cámara predeterminada'}</button>}
      {loading && <p className="text-sm">Abriendo cámara…</p>}
      {!photo && cameras.length > 0 && <label className="block text-xs font-semibold">{rearOnly ? 'Cámara trasera o lente' : 'Cámara'}
        <Select aria-label={rearOnly ? 'Seleccionar cámara trasera o lente' : 'Seleccionar cámara'} disabled={loading} value={currentDeviceId || selectedDeviceId} onChange={event => setSelectedDeviceId(event.target.value)} className="block w-full mt-1 border rounded-lg p-2 text-sm">
          {!cameras.some(camera => camera.id === (currentDeviceId || selectedDeviceId)) && <option value="">Cámara actual</option>}
          {cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.label}</option>)}
        </Select>
      </label>}
      {!photo && <p className="text-xs text-slate-500">{rearOnly ? `${cameras.length} cámaras traseras identificadas. Solo se pueden seleccionar los lentes traseros que el navegador permita usar.` : `${cameras.length} cámaras disponibles. Puede elegir la cámara integrada o una cámara conectada.`}</p>}
      {multiple && <p role="status" className="text-sm">{addedCount} {addedCount === 1 ? 'foto añadida' : 'fotos añadidas'} en esta sesión. Puede seguir capturando o terminar.</p>}
      <div className="responsive-actions">
        <input autoComplete="off" autoCorrect="off" spellCheck={false} ref={fileRef} type="file" accept="image/*" capture={rearOnly ? 'environment' : undefined} className="hidden" onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => fileRef.current?.click()} className="border rounded-lg px-3 py-2 text-sm">Elegir archivo</button>
        {!photo && <button type="button" disabled={loading || cameras.length < 2} onClick={() => {
          if (cameras.length > 1) setSelectedDeviceId(nextCameraId(cameras, currentDeviceId || selectedDeviceId));
        }} className="border rounded-lg px-3 py-2 text-sm">Cambiar cámara</button>}
        {!photo && <button type="button" disabled={!ready} onClick={snap} className="ui-camera-capture bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm">Capturar</button>}
        {photo && <><button type="button" onClick={() => { setSelectedDeviceId(readCameraPreference()); setPhoto(null); }} className="border rounded-lg px-3 py-2 text-sm">Repetir</button>
          {multiple && <button type="button" onClick={() => acceptPhoto(false)} className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm">Añadir y tomar otra</button>}
          <button type="button" onClick={() => acceptPhoto(true)} className="bg-[#3e4e9e] text-white rounded-lg px-3 py-2 text-sm">{multiple ? 'Añadir y terminar' : 'Usar foto'}</button></>}
        {multiple && !photo && <button type="button" onClick={close} className="border rounded-lg px-3 py-2 text-sm">Terminar</button>}
      </div>
    </section>
  </div></Presence>, document.body);
}
