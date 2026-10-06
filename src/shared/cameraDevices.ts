export function isRearCamera(label: string, facingMode?: string) {
  const name = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').toLowerCase();
  if (/\b(front|frontal|frontale|delantera|delantero|user|selfie|facetime)\b/.test(name)) return false;
  if (facingMode) return facingMode === 'environment';
  return /\b(back|rear|environment|trasera|trasero|traseira|traseiro|posterior|arriere|ruck|ruckseite|rueckseite)\b/.test(name);
}
export function cameraInputs(devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[], verifiedRearIds: readonly string[] = []) {
  const unique = new Map(devices.filter(device => device.kind === 'videoinput' && device.deviceId).map(device => [device.deviceId, device]));
  return [...unique.values()].filter(device => isRearCamera(device.label, verifiedRearIds.includes(device.deviceId) ? 'environment' : undefined))
    .map((device, index) => ({ id: device.deviceId, label: device.label || `Cámara trasera ${index + 1}` }));
}
export function nextCameraId(devices: { id: string }[], current: string) {
  return devices.length ? devices[(devices.findIndex(device => device.id === current) + 1) % devices.length].id : '';
}
