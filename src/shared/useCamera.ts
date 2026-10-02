import { useEffect, useRef, useState } from 'react';

export function useCamera(enabled: boolean, facingMode: 'environment' | 'user') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let activeVideo: HTMLVideoElement | null = null;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere un navegador compatible y una conexión segura.');
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, aspectRatio: { ideal: 1 } }, audio: false });
      if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      activeVideo = videoRef.current;
      if (activeVideo) {
        activeVideo.srcObject = acquired;
        await activeVideo.play();
      }
      if (!cancelled) { setReady(true); setLoading(false); }
    };
    Promise.resolve().then(() => { setLoading(true); setError(''); setReady(false); return start(); })
      .catch(cause => { if (!cancelled) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la cámara.'); setLoading(false); } });
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop());
      if (activeVideo) activeVideo.srcObject = null; };
  }, [enabled, facingMode]);
  return { videoRef, loading, error, ready };
}
