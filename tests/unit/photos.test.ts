import assert from 'node:assert/strict';
import test from 'node:test';
import { itemPhotos, saveGallery } from '../../src/domain/photos';
import { mapElemento } from '../../src/data/mappers';
import { cameraInputs, isMobileCameraDevice, isRearCamera, nextCameraId } from '../../src/shared/cameraDevices';

test('gallery maps cloud metadata, preserves order and removes empty or duplicate photos', () => {
  const item = mapElemento({ foto_url: 'storage://main', especificaciones: {
    fotos_adicionales: ['storage://other', null, '', 'storage://main', 'storage://other', ' storage://last '], entrada_excel: '42',
  } });
  assert.deepEqual(itemPhotos(item), ['storage://main', 'storage://other', 'storage://last']);
  assert.equal(item.especificaciones?.entrada_excel, '42');
  assert.deepEqual(itemPhotos({ fotoUrl: '' }), []);
});

test('gallery commits all photos before deleting removed files and can promote an additional photo', async () => {
  const events: string[] = [];
  const result = await saveGallery({ fotoUrl: '', fotosAdicionales: ['storage://keep', 'new-photo'] },
    { fotoUrl: 'storage://old', fotosAdicionales: ['storage://keep'] }, {
      save: async value => { events.push(`save:${value}`); return value.startsWith('storage:') ? value : 'storage://new'; },
      remove: async value => { events.push(`remove:${value}`); },
    }, async gallery => { events.push('commit'); assert.deepEqual(gallery, { main: 'storage://keep', additional: ['storage://new'] }); return 'saved'; });
  assert.equal(result, 'saved');
  assert.deepEqual(events, ['save:storage://keep', 'save:new-photo', 'commit', 'remove:storage://old']);
});

test('partial uploads roll back; uncertain database responses preserve photos that may have committed', async () => {
  for (const failCommit of [false, true]) {
    const removed: string[] = [];
    let committed = false;
    await assert.rejects(saveGallery({ fotoUrl: 'new-photo', fotosAdicionales: ['second-photo'] }, { fotoUrl: 'storage://old' }, {
      save: async value => { if (!failCommit && value === 'second-photo') throw new Error('Upload failed'); return `storage://${value}`; },
      remove: async value => { removed.push(value); },
    }, async () => { committed = true; throw new Error('Commit failed'); }));
    assert.equal(committed, failCommit);
    assert.deepEqual(removed, failCommit ? [] : ['storage://new-photo']);
    assert.equal(removed.includes('storage://old'), false);
  }
});

test('changing principal to an existing extra keeps both files and adds no gallery limit', async () => {
  const removed: string[] = [];
  const additional = Array.from({ length: 30 }, (_, index) => `storage://photo-${index}`);
  await saveGallery({ fotoUrl: additional[0], fotosAdicionales: ['storage://main', ...additional.slice(1)] },
    { fotoUrl: 'storage://main', fotosAdicionales: additional }, { save: async value => value, remove: async value => { removed.push(value); } },
    async gallery => { assert.equal(gallery.additional.length, 30); });
  assert.deepEqual(removed, []);
});

test('camera policy recognizes phones and tablets including desktop iPads, while touch PCs retain all webcams', () => {
  for (const device of [
    { userAgent: 'Mozilla/5.0 (Linux; Android 16) Chrome/140', userAgentData: { mobile: false } },
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19)' },
    { userAgent: 'Mozilla/5.0 (iPad; CPU OS 19)' },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 5 },
    { userAgentData: { mobile: true } }, { userAgentData: { platform: 'Android', mobile: false } },
  ]) assert.equal(isMobileCameraDevice(device), true);
  for (const device of [
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 10 },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 0 },
    { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }, {},
  ]) assert.equal(isMobileCameraDevice(device), false);
  const devices = cameraInputs([
    { kind: 'videoinput', deviceId: 'webcam', label: 'Integrated Front Camera' },
    { kind: 'videoinput', deviceId: 'usb', label: '' },
    { kind: 'videoinput', deviceId: 'usb', label: '' },
    { kind: 'audioinput', deviceId: 'mic', label: 'Microphone' },
  ], [], false);
  assert.deepEqual(devices, [{ id: 'webcam', label: 'Integrated Front Camera' }, { id: 'usb', label: 'Cámara 2' }]);
});

test('camera switch cycles only rear lenses, excludes front and unidentified devices and removes duplicates', () => {
  const devices = cameraInputs([
    { kind: 'videoinput', deviceId: 'wide', label: 'Trasera gran angular' },
    { kind: 'audioinput', deviceId: 'mic', label: 'Micrófono' },
    { kind: 'videoinput', deviceId: 'tele', label: 'Trasera telefoto' },
    { kind: 'videoinput', deviceId: 'front', label: 'Frontal' },
    { kind: 'videoinput', deviceId: 'selfie', label: 'Front Camera' },
    { kind: 'videoinput', deviceId: 'unknown', label: '' },
    { kind: 'videoinput', deviceId: 'confirmed', label: 'camera2 0' },
    { kind: 'videoinput', deviceId: 'wide', label: 'Trasera gran angular' },
  ], ['confirmed']);
  assert.equal(devices.length, 3);
  assert.equal(nextCameraId(devices, 'wide'), 'tele');
  assert.equal(nextCameraId(devices, 'tele'), 'confirmed');
  assert.equal(nextCameraId(devices, 'confirmed'), 'wide');
  assert.equal(nextCameraId([], ''), '');
  assert.equal(cameraInputs([{ kind: 'videoinput', deviceId: 'front', label: 'Front Camera' }], ['front']).length, 0);
  assert.equal(isRearCamera('Back Camera'), true);
  assert.equal(isRearCamera('camera2 1, facing front', 'environment'), false);
  assert.equal(isRearCamera('Rear Camera', 'user'), false);
  assert.equal(isRearCamera('camera2 0', 'environment'), true);
  assert.equal(isRearCamera('camera2 0'), false);
});
