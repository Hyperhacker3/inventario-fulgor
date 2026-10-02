import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { squareCrop } from '../../src/shared/squareImage';
import { uploadItemImage } from '../../src/shared/itemImageUpload';

test('square photos crop portrait and landscape at the center without stretching or upscaling', () => {
  assert.deepEqual(squareCrop(900, 1600), { x: 0, y: 350, side: 900, size: 900 });
  assert.deepEqual(squareCrop(1600, 900), { x: 350, y: 0, side: 900, size: 900 });
  assert.deepEqual(squareCrop(2000, 2000), { x: 0, y: 0, side: 2000, size: 1200 });
  assert.deepEqual(squareCrop(640, 480, 1024), { x: 80, y: 0, side: 480, size: 480 });
  assert.throws(() => squareCrop(0, 100), /dimensiones/);
});

function fakeStorage(user: string | null, uploadError: string | null = null) {
  const calls: { bucket: string; path: string; image: Blob; options: unknown }[] = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) },
    storage: { from: (bucket: string) => ({ upload: async (path: string, image: Blob, options: unknown) => {
      calls.push({ bucket, path, image, options });
      return { error: uploadError ? { message: uploadError } : null };
    } }) },
  } as unknown as Pick<SupabaseClient, 'auth' | 'storage'>;
  return { db, calls };
}

test('photos are uploaded to private Supabase storage and return a cloud reference', async () => {
  const { db, calls } = fakeStorage('test-account');
  const photo = new Blob(['synthetic photo'], { type: 'image/jpeg' });
  const reference = await uploadItemImage(db, photo);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bucket, 'item-images');
  assert.match(calls[0].path, /^test-account\/[\da-f-]+\.jpg$/);
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
