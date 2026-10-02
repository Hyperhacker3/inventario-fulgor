import { useEffect, useRef, useState } from 'react';
import { cameraInputs } from './cameraDevices';

export function useCamera(enabled: boolean, facingMode: 'environment' | 'user', deviceId = '') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [mirrored, setMirrored] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let activeVideo: HTMLVideoElement | null = null;
    const refreshDevices = async () => {
      try {
        const inputs = cameraInputs(await navigator.mediaDevices.enumerateDevices());
        if (!cancelled) setCameras(inputs);
      } catch { /* Capturing remains available if device enumeration is restricted. */ }
    };
    const start = async () => {
      if (cancelled) return;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere un navegador compatible y una conexión segura.');
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }), width: { ideal: 1280 }, aspectRatio: { ideal: 1 } }, audio: false });
      if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const settings = acquired.getVideoTracks()[0]?.getSettings();
      if (!cancelled) {
        setCurrentDeviceId(settings?.deviceId || deviceId);
        setMirrored(settings?.facingMode === 'user' || (!deviceId && facingMode === 'user'));
      }
      activeVideo = videoRef.current;
      if (activeVideo) {
        activeVideo.srcObject = acquired;
        await activeVideo.play();
      }
      if (!cancelled) { setReady(true); setLoading(false); }
      await refreshDevices();
    };
    Promise.resolve().then(() => { setLoading(true); setError(''); setReady(false); return start(); })
      .catch(cause => { stream?.getTracks().forEach(track => track.stop()); if (!cancelled) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la cámara.'); setLoading(false); setReady(false); } });
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop());
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
      if (activeVideo) activeVideo.srcObject = null; };
  }, [enabled, facingMode, deviceId]);
  return { videoRef, loading, error, ready, cameras, currentDeviceId, mirrored };
}
