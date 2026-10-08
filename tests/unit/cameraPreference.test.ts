import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement as h, useState } from 'react';
import { CameraCaptureModal } from '../../src/components/CameraCaptureModal';
import { OutgoingPhotoPicker } from '../../src/components/dispatch/OutgoingPhotoPicker';
import { useCamera } from '../../src/shared/useCamera';
import { readCameraPreference, saveCameraPreference } from '../../src/shared/cameraPreference';
import { helpGuide } from '../../src/components/help/helpGuide';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');

function mockCamera(mobile = false, unavailable = '') {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const play = dom.window.HTMLMediaElement.prototype.play;
  const canvasContext = dom.window.HTMLCanvasElement.prototype.getContext;
  const canvasData = dom.window.HTMLCanvasElement.prototype.toDataURL;
  const width = Object.getOwnPropertyDescriptor(dom.window.HTMLVideoElement.prototype, 'videoWidth');
  const height = Object.getOwnPropertyDescriptor(dom.window.HTMLVideoElement.prototype, 'videoHeight');
  const requested: MediaStreamConstraints[] = [], stopped: string[] = [];
  let frame = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 16)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    mediaDevices: {
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        requested.push(constraints);
        const id = ((constraints.video as MediaTrackConstraints).deviceId as ConstrainDOMStringParameters)?.exact as string || 'wide';
        if (id === unavailable) throw Object.assign(new Error('Camera removed'), { name: 'NotFoundError' });
        const track = { label: id === 'front' ? 'Front Camera' : `Back ${id}`, stop: () => stopped.push(id), getSettings: () => ({ deviceId: id, facingMode: id === 'front' ? 'user' : 'environment' }) };
        return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
      },
      enumerateDevices: async () => ['wide', 'tele', 'front'].map(id => ({ kind: 'videoinput', deviceId: id, label: id === 'front' ? 'Front Camera' : `Back ${id}` })),
      addEventListener: () => {}, removeEventListener: () => {},
    },
  } });
  dom.window.HTMLMediaElement.prototype.play = async () => {};
  dom.window.HTMLCanvasElement.prototype.getContext = (() => ({ drawImage: () => {}, fillRect: () => {} })) as unknown as typeof canvasContext;
  dom.window.HTMLCanvasElement.prototype.toDataURL = () => `data:image/jpeg;base64,frame${++frame}`;
  Object.defineProperty(dom.window.HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 1024 });
  Object.defineProperty(dom.window.HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 768 });
  return { requested, stopped, restore: () => {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous); else Reflect.deleteProperty(globalThis, 'navigator');
    dom.window.HTMLMediaElement.prototype.play = play;
    dom.window.HTMLCanvasElement.prototype.getContext = canvasContext;
    dom.window.HTMLCanvasElement.prototype.toDataURL = canvasData;
    if (width) Object.defineProperty(dom.window.HTMLVideoElement.prototype, 'videoWidth', width);
    if (height) Object.defineProperty(dom.window.HTMLVideoElement.prototype, 'videoHeight', height);
  } };
}

function button(text: string, scope: ParentNode = document): HTMLButtonElement {
  const result = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(value => value.textContent === text);
  assert.ok(result, `Button ${text} is available`);
  return result;
}
const lastDevice = (requested: MediaStreamConstraints[]) => ((requested.at(-1)!.video as MediaTrackConstraints).deviceId as ConstrainDOMStringParameters)?.exact;

test('a verified lens persists across preview retakes, reopened product capture and a separate outgoing camera', async () => {
  localStorage.clear();
  const mock = mockCamera(true), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const captured: string[] = [];
  function ProductCamera() {
    const [open, setOpen] = useState(true);
    return h('div', null, h('button', { onClick: () => setOpen(true) }, 'Open'),
      h(CameraCaptureModal, { isOpen: open, onClose: () => setOpen(false), onPhotoCaptured: photo => captured.push(photo) }));
  }
  try {
    await act(async () => root.render(h(ProductCamera)));
    assert.equal(readCameraPreference(), 'wide');
    await act(() => document.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
    await act(async () => document.querySelector<HTMLButtonElement>('[role="option"][data-value="tele"]')!.click());
    assert.equal(readCameraPreference(), 'tele');
    await act(() => button('Capturar').click());
    await act(async () => button('Repetir').click());
    assert.equal(lastDevice(mock.requested), 'tele');
    await act(() => button('Capturar').click());
    await act(() => button('Usar foto').click());
    assert.equal(captured.length, 1);
    await act(async () => button('Open', host).click());
    assert.equal(lastDevice(mock.requested), 'tele');
    await act(() => root.render(h(OutgoingPhotoPicker, { photos: [], onChange: () => {}, onBusyChange: () => {} })));
    await act(async () => button('Tomar foto', host).click());
    assert.equal(lastDevice(mock.requested), 'tele');
    assert.deepEqual((mock.requested.at(-1)!.video as MediaTrackConstraints).facingMode, { exact: 'environment' });
    assert.equal(localStorage.length, 1, 'Only the camera preference is cached, not photographs');
  } finally { await act(() => root.unmount()); host.remove(); mock.restore(); localStorage.clear(); }
  assert.equal(mock.stopped.length, mock.requested.length);
});

test('outgoing capture appends several photographs, rejects duplicate acceptance and keeps accepted photos when finishing', async () => {
  localStorage.clear();
  const mock = mockCamera(), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let saved: string[] = [];
  function Outgoing() {
    const [photos, setPhotos] = useState<string[]>([]);
    saved = photos;
    return h(OutgoingPhotoPicker, { photos, onChange: setPhotos, onBusyChange: () => {} });
  }
  try {
    await act(() => root.render(h(Outgoing)));
    await act(async () => button('Tomar foto', host).click());
    await act(() => button('Capturar').click());
    const add = button('Añadir y tomar otra');
    await act(async () => { add.click(); add.click(); });
    assert.equal(saved.length, 1);
    assert.match(document.querySelector('[role="status"]')!.textContent!, /1 foto añadida/);
    await act(() => button('Capturar').click());
    await act(async () => button('Repetir').click());
    assert.equal(saved.length, 1, 'Retaking discards the preview without removing accepted photos');
    await act(() => button('Capturar').click());
    await act(() => button('Añadir y terminar').click());
    assert.equal(saved.length, 2);
    assert.notEqual(saved[0], saved[1]);
    assert.equal(document.querySelector('.ui-presence')?.getAttribute('data-open'), 'false');
    await act(async () => button('Tomar foto', host).click());
    await act(() => button('Capturar').click());
    await act(async () => button('Añadir y tomar otra').click());
    await act(() => button('Terminar').click());
    assert.equal(saved.length, 3);
    await act(() => host.querySelector<HTMLButtonElement>('[aria-label="Quitar foto de salida 2"]')!.click());
    assert.equal(saved.length, 2);
  } finally { await act(() => root.unmount()); host.remove(); mock.restore(); localStorage.clear(); }
  assert.equal(mock.stopped.length, mock.requested.length);
});

test('an unavailable cached camera falls back to the rear default and a front stream is never cached on mobile', async () => {
  localStorage.clear(); saveCameraPreference('removed');
  const mock = mockCamera(true, 'removed'), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let camera!: ReturnType<typeof useCamera>;
  function Camera({ id }: { id: string }) { camera = useCamera(true, id, 1, true); return h('video', { ref: camera.videoRef }); }
  try {
    await act(async () => root.render(h(Camera, { id: readCameraPreference() })));
    assert.equal(camera.ready, true); assert.equal(camera.currentDeviceId, 'wide');
    assert.equal(mock.requested.length, 2); assert.equal(readCameraPreference(), 'wide');
    assert.equal(lastDevice(mock.requested), undefined);
    assert.ok(mock.requested.every(request => (request.video as MediaTrackConstraints).facingMode !== undefined));
    await act(async () => root.render(h(Camera, { id: 'front' })));
    assert.equal(camera.ready, false); assert.match(camera.error, /cámara trasera/);
    assert.equal(readCameraPreference(), 'wide');
    assert.ok(mock.stopped.includes('front'));
  } finally { await act(() => root.unmount()); host.remove(); mock.restore(); localStorage.clear(); }
});

test('camera capture remains usable when the browser blocks preference storage', async () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage blocked'); } });
  const mock = mockCamera(), host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  let camera!: ReturnType<typeof useCamera>;
  function Camera() { camera = useCamera(true, readCameraPreference(), 1, true); return h('video', { ref: camera.videoRef }); }
  try {
    assert.doesNotThrow(() => saveCameraPreference('tele'));
    await act(async () => root.render(h(Camera)));
    assert.equal(camera.ready, true); assert.equal(camera.currentDeviceId, 'wide');
  } finally {
    await act(() => root.unmount()); host.remove(); mock.restore();
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
  }
});

test('the in-app guide covers current functions and matches the maintained usage documentation without installation instructions', () => {
  const documentation = readFileSync(new URL('../../docs/guia-funciones.md', import.meta.url), 'utf8');
  for (const section of helpGuide) {
    assert.ok(documentation.includes(section.title));
    for (const item of section.items) assert.ok(documentation.includes(item));
  }
  const text = helpGuide.flatMap(section => section.items).join(' ');
  assert.match(text, /Añadir y tomar otra/);
  assert.match(text, /REGULAR, MALO, EN REPARACIÓN y RETAZOS/);
  assert.match(text, /Editar abre una ventana encima/);
  assert.doesNotMatch(text, /Instalación|migracion|migración|SQL Editor|\.env|Supabase|README/);
});
