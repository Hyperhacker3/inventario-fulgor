const CAMERA_KEY = 'el_turpial_camera_device';

export function readCameraPreference(): string {
  try { return localStorage.getItem(CAMERA_KEY) || ''; }
  catch { return ''; }
}

export function saveCameraPreference(deviceId: string): void {
  try {
    if (deviceId) localStorage.setItem(CAMERA_KEY, deviceId);
    else localStorage.removeItem(CAMERA_KEY);
  } catch { /* Capturing remains available when local storage is blocked. */ }
}
