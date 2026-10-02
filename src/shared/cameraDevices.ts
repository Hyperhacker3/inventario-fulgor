export function cameraInputs(devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[]) {
  const unique = new Map(devices.filter(device => device.kind === 'videoinput' && device.deviceId).map(device => [device.deviceId, device]));
  return [...unique.values()].map((device, index) => ({ id: device.deviceId, label: device.label || `Cámara ${index + 1}` }));
}
export function nextCameraId(devices: { id: string }[], current: string) {
  return devices.length ? devices[(devices.findIndex(device => device.id === current) + 1) % devices.length].id : '';
}
