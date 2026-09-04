import React, { useState, useEffect, useRef } from 'react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoDataUrl: string) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  title = 'Tomar Foto con Cámara'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);

  // Stop current stream
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Check camera devices
  useEffect(() => {
    if (!isOpen) return;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Start camera when modal is open and no photo is captured yet
  useEffect(() => {
    if (!isOpen || capturedPhoto) return;

    let isMounted = true;
    setIsLoadingCamera(true);
    setCameraError(null);

    const startCamera = async () => {
      try {
        stopStream();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Su navegador no soporta acceso directo a la cámara web.');
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        });

        if (!isMounted) {
          newStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
        setIsLoadingCamera(false);
      } catch (err: any) {
        console.warn('Camera access error:', err);
        if (isMounted) {
          setIsLoadingCamera(false);
          setCameraError(
            err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Permiso de cámara no concedido. Puede activar la cámara nativa con el botón inferior.'
              : 'No se pudo acceder a la cámara del dispositivo o está en uso por otra aplicación.'
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [isOpen, facingMode, capturedPhoto]);

  // Handle take snapshot
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 800;
    const height = video.videoHeight || 600;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip if user-facing (selfie) camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedPhoto(dataUrl);
    stopStream();
  };

  // Toggle between front and back camera
  const toggleFacingMode = () => {
    stopStream();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Native file/camera capture fallback
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCapturedPhoto(result);
        stopStream();
      }
    };
    reader.readAsDataURL(file);
  };

  // Confirm photo
  const handleConfirmPhoto = () => {
    if (capturedPhoto) {
      onPhotoCaptured(capturedPhoto);
      handleClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Close and cleanup
  const handleClose = () => {
    stopStream();
    setCapturedPhoto(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#131b2e] text-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#8ab4f8] text-[22px]">photo_camera</span>
            <h3 className="font-bold text-sm sm:text-base text-white">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Viewfinder / Captured Photo */}
        <div className="relative aspect-4/3 sm:aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Viewfinder Overlay / Reticle */}
              {!cameraError && !isLoadingCamera && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-4/5 h-4/5 border-2 border-dashed border-white/60 rounded-xl relative shadow-lg">
                    <span className="absolute top-2 left-2 text-[10px] font-mono-code bg-black/60 px-2 py-0.5 rounded text-white/80">
                      Enfoque del componente
                    </span>
                    {/* Corner Crosshairs */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#8ab4f8]"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#8ab4f8]"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#8ab4f8]"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#8ab4f8]"></div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                  <span className="material-symbols-outlined text-[32px] text-[#8ab4f8] animate-spin">
                    progress_activity
                  </span>
                  <p className="text-xs text-slate-300">Iniciando cámara...</p>
                </div>
              )}

              {/* Error State */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 gap-3">
                  <span className="material-symbols-outlined text-[36px] text-amber-400">videocam_off</span>
                  <p className="text-xs text-slate-200 max-w-xs">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#3e4e9e] hover:bg-[#4d5eb6] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                    <span>Abrir Cámara Nativa / Archivo</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden Input for Native Camera / Files */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeFileChange}
          />
        </div>

        {/* Controls / Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {capturedPhoto ? (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Tomar otra</span>
              </button>

              <button
                onClick={handleConfirmPhoto}
                className="px-5 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Usar esta foto</span>
              </button>
            </>
          ) : (
            <>
              {/* Camera Switcher (Front/Back) */}
              {hasMultipleCameras ? (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Cambiar Cámara Frontal / Trasera"
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
                </button>
              ) : (
                <div className="w-10"></div>
              )}

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={Boolean(cameraError) || isLoadingCamera}
                title="Capturar Foto"
                className="w-14 h-14 rounded-full bg-white hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform active:scale-90 border-4 border-slate-700"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                </div>
              </button>

              {/* Native Mobile Camera Button Fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Abrir cámara del sistema / archivo"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">photo_library</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
