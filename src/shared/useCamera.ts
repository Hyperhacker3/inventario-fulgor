import { useEffect, useRef, useState } from 'react';
import { cameraInputs, isMobileCameraDevice, isRearCamera } from './cameraDevices';

export function useCamera(enabled: boolean, deviceId = '', aspectRatio = 1) {
  const rearOnly = isMobileCameraDevice(typeof navigator === 'undefined' ? {} : navigator);
  const videoRef = useRef<HTMLVideoElement>(null);
  const verifiedRearIds = useRef(new Set<string>());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  useEffect(() => {
    if (!enabled) { verifiedRearIds.current.clear(); return; }
    let cancelled = false;
    let stream: MediaStream | null = null;
    let activeVideo: HTMLVideoElement | null = null;
    let rearDeviceId = '';
    const refreshDevices = async () => {
      try {
        const inputs = cameraInputs(await navigator.mediaDevices.enumerateDevices(), [...verifiedRearIds.current], rearOnly);
        if (!cancelled) setCameras(inputs);
      } catch { /* Capturing remains available if device enumeration is restricted. */ }
    };
    const start = async () => {
      if (cancelled) return;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere un navegador compatible y una conexión segura.');
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { ...(rearOnly ? { facingMode: { exact: 'environment' } } : {}), ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1280 }, aspectRatio: { ideal: aspectRatio } }, audio: false });
      if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const track = acquired.getVideoTracks()[0];
      const settings = track?.getSettings();
      if (!track) throw new Error('No se pudo abrir la cámara. Puede subir una foto desde Elegir archivo.');
      if (rearOnly && !isRearCamera(track.label || '', settings?.facingMode)) throw new Error('No se pudo identificar una cámara trasera. Puede subir una foto desde Elegir archivo.');
      rearDeviceId = settings?.deviceId || deviceId;
      if (rearOnly && rearDeviceId) verifiedRearIds.current.add(rearDeviceId);
      if (!cancelled) {
        setCurrentDeviceId(rearDeviceId);
      }
      activeVideo = videoRef.current;
      if (activeVideo) {
        activeVideo.srcObject = acquired;
        await activeVideo.play();
      }
      if (!cancelled) { setReady(true); setLoading(false); }
      await refreshDevices();
    };
    Promise.resolve().then(() => { if (cancelled) return; setLoading(true); setError(''); setReady(false); setCameras([]); setCurrentDeviceId(''); return start(); })
      .catch(cause => { stream?.getTracks().forEach(track => track.stop()); stream = null; if (!cancelled) {
        const unavailable = cause instanceof Error && ['OverconstrainedError', 'NotFoundError'].includes(cause.name);
        setError(unavailable ? `No hay una cámara${rearOnly ? ' trasera' : ''} disponible para esta selección. Puede subir una foto desde Elegir archivo.` : cause instanceof Error ? cause.message : 'No se pudo abrir la cámara.'); setLoading(false); setReady(false);
      } });
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop());
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
      if (activeVideo) activeVideo.srcObject = null; };
  }, [enabled, deviceId, aspectRatio, rearOnly]);
  return { videoRef, loading, error, ready, cameras, currentDeviceId, rearOnly };
}
