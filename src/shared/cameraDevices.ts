export function isRearCamera(label: string, facingMode?: string) {
  const name = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').toLowerCase();
  if (/\b(front|frontal|frontale|delantera|delantero|user|selfie|facetime)\b/.test(name)) return false;
  if (facingMode) return facingMode === 'environment';
  return /\b(back|rear|environment|trasera|trasero|traseira|traseiro|posterior|arriere|ruck|ruckseite|rueckseite)\b/.test(name);
}
export function cameraInputs(devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[], verifiedRearIds: readonly string[] = [], rearOnly = true) {
  const unique = new Map(devices.filter(device => device.kind === 'videoinput' && device.deviceId).map(device => [device.deviceId, device]));
  return [...unique.values()].filter(device => !rearOnly || isRearCamera(device.label, verifiedRearIds.includes(device.deviceId) ? 'environment' : undefined))
    .map((device, index) => ({ id: device.deviceId, label: device.label || `${rearOnly ? 'Cámara trasera' : 'Cámara'} ${index + 1}` }));
}
export function nextCameraId(devices: { id: string }[], current: string) {
  return devices.length ? devices[(devices.findIndex(device => device.id === current) + 1) % devices.length].id : '';
}
interface CameraDevicePlatform {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: { mobile?: boolean; platform?: string };
}
export function isMobileCameraDevice(device: CameraDevicePlatform) {
  const agent = device.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Windows Phone|Mobile|Tablet|Silk|Kindle/i.test(agent)) return true;
  // iPadOS can report a Mac desktop identity. Touch on Windows alone remains a PC.
  if ((device.platform === 'MacIntel' || /Macintosh/i.test(agent)) && (device.maxTouchPoints || 0) > 1) return true;
  return device.userAgentData?.mobile === true || device.userAgentData?.platform === 'Android';
}
