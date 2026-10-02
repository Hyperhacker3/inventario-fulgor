import type { SupabaseClient } from '@supabase/supabase-js';
import { imagePaths } from './imagePaths';

export async function uploadItemImage(db: Pick<SupabaseClient, 'auth' | 'storage'>, image: Blob, thumbnail: Blob): Promise<string> {
  const { data, error: sessionError } = await db.auth.getUser();
  if (sessionError || !data.user) throw new Error('Debe iniciar sesión para subir fotografías.');
  const path = `${data.user.id}/${crypto.randomUUID()}/full.jpg`;
  const bucket = db.storage.from('item-images');
  const paths = imagePaths(path);
  const options = { contentType: 'image/jpeg', upsert: false };
  const main = await bucket.upload(path, image, options);
  if (main.error) throw new Error(`No se pudo guardar la foto en Supabase: ${main.error.message}`);
  try {
    const preview = await bucket.upload(paths[1], thumbnail, options);
    if (preview.error) throw new Error(`No se pudo guardar la miniatura en Supabase: ${preview.error.message}`);
  } catch (error) {
    await bucket.remove(paths).catch(() => {});
    throw error;
  }
  return `storage://${path}`;
}
