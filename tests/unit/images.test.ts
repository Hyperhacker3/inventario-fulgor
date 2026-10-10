import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { squareCrop } from '../../src/shared/squareImage';
import { uploadItemImage } from '../../src/shared/itemImageUpload';
import { imagePaths } from '../../src/shared/imagePaths';
import { saveImage } from '../../src/shared/images';
import { encodePhoto } from '../../src/shared/photoEncoding';

test('square photos crop portrait and landscape at the center without stretching or upscaling', () => {
  assert.deepEqual(squareCrop(900, 1600), { x: 0, y: 350, side: 900, size: 900 });
  assert.deepEqual(squareCrop(1600, 900), { x: 350, y: 0, side: 900, size: 900 });
  assert.deepEqual(squareCrop(2000, 2000), { x: 0, y: 0, side: 2000, size: 1200 });
  assert.deepEqual(squareCrop(640, 480), { x: 80, y: 0, side: 480, size: 480 });
  assert.throws(() => squareCrop(0, 100), /dimensiones/);
});

function fakeStorage(user: string | null, uploadError: string | null = null, failAt = 1) {
  const calls: { bucket: string; path: string; image: Blob; options: unknown }[] = [];
  const removed: string[][] = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) },
    storage: { from: (bucket: string) => ({ upload: async (path: string, image: Blob, options: unknown) => {
      calls.push({ bucket, path, image, options });
      return { error: uploadError && calls.length === failAt ? { message: uploadError } : null };
    }, remove: async (paths: string[]) => { removed.push(paths); return { error: null }; } }) },
  } as unknown as Pick<SupabaseClient, 'auth' | 'storage'>;
  return { db, calls, removed };
}

test('photos are uploaded to private Supabase storage and return a cloud reference', async () => {
  const { db, calls } = fakeStorage('test-account');
  const photo = new Blob(['synthetic photo'], { type: 'image/jpeg' });
  const reference = await uploadItemImage(db, photo);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bucket, 'item-images');
  assert.match(calls[0].path, /^test-account\/[\da-f-]+\/full\.jpg$/);
  assert.equal(calls[0].image, photo);
  assert.deepEqual(calls[0].options, { contentType: 'image/jpeg', upsert: false });
  assert.equal(reference, `storage://${calls[0].path}`);
  assert.equal(reference.startsWith('data:'), false);
});

test('a failed photo upload or missing session cannot return a local success', async () => {
  const photo = new Blob(['synthetic photo'], { type: 'image/jpeg' });
  const failed = fakeStorage('test-account', 'Storage denied');
  await assert.rejects(uploadItemImage(failed.db, photo), /guardar la foto en Supabase: Storage denied/);
  const anonymous = fakeStorage(null);
  await assert.rejects(uploadItemImage(anonymous.db, photo), /iniciar sesión/);
  assert.equal(anonymous.calls.length, 0);
});

test('replacing a photo includes old thumbnail files in cleanup without changing legacy references', () => {
  assert.deepEqual(imagePaths('account/photo/full.jpg'), ['account/photo/full.jpg', 'account/photo/thumb.jpg']);
  assert.deepEqual(imagePaths('account/old-photo.jpg'), ['account/old-photo.jpg']);
  assert.deepEqual(imagePaths('account/photo/full.webp'), ['account/photo/full.webp']);
});

test('existing stored photographs remain unchanged when saving edits', async () => {
  for (const ref of ['storage://account/old-photo.jpg', 'storage://account/photo/full.jpg', 'storage://account/photo/full.webp']) {
    assert.equal(await saveImage(ref), ref);
  }
});

test('canvas keeps real WebP MIME or encodes JPEG when the browser silently returns PNG', async () => {
  const requested: string[] = [];
  const canvas = { toBlob: (done: (image: Blob | null) => void, type: string) => {
    requested.push(type); done(new Blob(['photo'], { type: type === 'image/webp' ? 'image/png' : type }));
  } } as HTMLCanvasElement;
  assert.equal((await encodePhoto(canvas)).type, 'image/jpeg');
  assert.deepEqual(requested, ['image/webp', 'image/jpeg']);
  canvas.toBlob = (done, type) => done(new Blob(['photo'], { type }));
  assert.equal((await encodePhoto(canvas)).type, 'image/webp');
  canvas.toBlob = done => done(null);
  await assert.rejects(encodePhoto(canvas), /comprimir/);
});

test('new WebP photos upload one file with its actual MIME type', async () => {
  const photo = new Blob(['photo'], { type: 'image/webp' });
  const storage = fakeStorage('test-account');
  const reference = await uploadItemImage(storage.db, photo);
  assert.equal(storage.calls.length, 1);
  assert.match(reference, /^storage:\/\/test-account\/[\da-f-]+\/full\.webp$/);
  assert.equal(storage.calls[0].image, photo);
  assert.deepEqual(storage.calls[0].options, { contentType: 'image/webp', upsert: false });
});

test('a JPG-only bucket falls back once without retrying permission or quota failures', async () => {
  const webp = new Blob(['webp'], { type: 'image/webp' }), jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
  let conversions = 0;
  const fallback = async () => { conversions++; return jpeg; };
  const old = fakeStorage('test-account', 'mime type image/webp is not supported');
  const reference = await uploadItemImage(old.db, webp, fallback);
  assert.equal(conversions, 1); assert.match(reference, /\/full\.jpg$/);
  assert.deepEqual(old.calls.map(call => call.image.type), ['image/webp', 'image/jpeg']);
  const denied = fakeStorage('test-account', 'Storage denied');
  await assert.rejects(uploadItemImage(denied.db, webp, fallback), /Storage denied/);
  assert.equal(conversions, 1); assert.equal(denied.calls.length, 1);
});
